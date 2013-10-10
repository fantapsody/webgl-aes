GLAES = function(options){
    if(options){
	if(options.useXORBigTable){
	    this.useXORBigTable = true;
	} else {
	    this.useXORBigTable = false;
	}
    } else {
	options = [];
    }

    if(options.canvas)
	this.engine = new GLEngine(options.canvas);
    else
	this.engine = new GLEngine();

    console.log(options);
    var xor_func = "shader/func_xor.shader";
    var func_utils = "shader/func_utils.shader";
    if(this.useXORBigTable){
	xor_func = "shader/func_xor_big.shader";
    }
    this.engine.createProgramFromUrls({
	"programName" : "beforerounds",
	"fragmentShaderUrl" : [func_utils, xor_func, "shader/aes_beforerounds.shader"]
    });
    this.engine.createProgramFromUrls({
	"programName" : "round",
	"fragmentShaderUrl" : [func_utils, xor_func, "shader/aes_round.shader"]
    });
    this.engine.createProgramFromUrls({
	"programName" : "afterrounds",
	"fragmentShaderUrl" : [func_utils, xor_func, "shader/aes_afterrounds.shader"]
    });
    this.engine.createProgramFromUrls({
	"programName" : "xor",
	"fragmentShaderUrl" : [func_utils, xor_func, "shader/xor.shader"]
    });
    
    if(!this.initAES()){
	throw "Cannot init AES!";
    }
}

GLAES.prototype = {
    useXORBigTable : false,
    engine : null,
    key : null,
    d : new Uint8Array(256),
    tbox : new Uint8Array(256 * 4),
    width : -1,
    height : -1,
    curfb : 0,
    getBlockSize : function(){
	return this.blocksize;
    },
    initAES : function(){
	for(var i = 0; i < 128; i++) {
	    this.d[i] = i << 1;
	    this.d[128 + i] = (i << 1) ^ 0x1b;
	}
	for(var i = 0; i < 256; i++){
	    this.tbox[i * 4] = this.d[this.sbox[i]];
	    this.tbox[i * 4 + 1] = this.sbox[i];
	    this.tbox[i * 4 + 2] = this.sbox[i];
	    this.tbox[i * 4 + 3] = this.d[this.sbox[i]] ^ this.sbox[i];
	}
	this.engine.createTexture("tbox", 256, 1, this.tbox);

	if(this.useXORBigTable){
		var xorTable = new Uint8Array(256 * 256);
		for(var j = 0; j < 256; j++){
			for(var i = 0; i < 256; i++){
				xorTable[j * 256 + i] = j ^ i;
			}
		}
		this.engine.createTexture("xor", 256, 256, xorTable, this.engine.getGL().ALPHA);
	} else {
		// xor with small table, may increase the performance for better locality
		var xorTable = new Uint8Array(16 * 16);
		for(var j = 0; j < 16; j++){
			for(var i = 0; i < 16; i++){
				xorTable[j * 16 + i] = j ^ i;
			}
		}
		this.engine.createTexture("xor", 16, 16, xorTable, this.engine.getGL().ALPHA);
	}

	return true;
    },
    expandKey : function(inkey) {
	var key = inkey.slice(0);
	var kl = key.length, ks, Rcon = 1;
	switch (kl) {
	case 16: ks = 16 * (10 + 1); break;
	case 24: ks = 16 * (12 + 1); break;
	case 32: ks = 16 * (14 + 1); break;
	default:
	    throw "AES_ExpandKey: Only key lengths of 16, 24 or 32 bytes allowed!";
	}
	for(var i = kl; i < ks; i += 4) {
	    var temp = key.slice(i - 4, i);
	    if (i % kl == 0) {
		temp = new Array(this.sbox[temp[1]] ^ Rcon, this.sbox[temp[2]], 
				 this.sbox[temp[3]], this.sbox[temp[0]]); 
		if ((Rcon <<= 1) >= 256)
		    Rcon ^= 0x11b;
	    } else if ((kl > 24) && (i % kl == 16))
		temp = new Array(this.box[temp[0]], this.box[temp[1]], 
				 this.sbox[temp[2]], this.box[temp[3]]);       
	    for(var j = 0; j < 4; j++)
		key[i + j] = key[i + j - kl] ^ temp[j];
	}
	return new Uint8Array(key);
    },
    setKey : function(inkey){
	this.key = this.expandKey(inkey);
	if(!this.key)
	    return false;
	this.engine.createTexture("key", 4, this.key.length / 16, this.key);
	return true;
    },
    // AES in CTR mode
    // require generateCTRSeq in util.js
    encrypt_ctr : function(pt, result, iv, ctr){
	if(!iv)
	    iv = 0;
	if(!ctr)
	    ctr = generateCTRSeq(iv, pt.length);
	if(!ctr.length || ctr.length != pt.length)
	    throw "Invalid length of CTR: " + ctr.length;
	this._encrypt(ctr);
	this.engine.useProgram("xor");
	this.curfb = 1 - this.curfb;
	this.engine.useFrameBuffer("fb" + this.curfb);
	this.engine.useFrameBufferAsTexture("fb" + (1 - this.curfb), "u_ectr");
	this.engine.createTexture("pt", this.width, this.height, pt);
	this.engine.render();
	// cleanup
	this.engine.useFrameBufferAsTexture("fb" + (1 - this.curfb), null);
	return this.engine.readResult(result);
    },
    decrypt_ctr : function(ct, result, iv, ctr){
	return this.encrypt_ctr(ct, result, iv, ctr);
    },
    // AES in ECB mode
    encrypt_ecb : function(pt, result){
	this._encrypt(pt);
	return this.engine.readResult(result);
    },
    setEncryptBufferSize : function(width, height){
	this.width = width;
	this.height = height;
	this.engine.createFramebuffer("fb0", width, height);
	this.engine.createFramebuffer("fb1", width, height);
    },
    _encrypt : function(pt){
	// the size of a pixel is 32 bit, which is 4 bytes
	if(pt.length % 4 != 0)
	    throw "Invalid plaintext length " + pt.length + "!";

	// console.log(this.width + "," + this.height + "," + pt.length);
	// check if the size of framebuffers need to be changed
	if(pt.length / 4 != this.width * this.height){
	    if(pt.length / 4 <= this.engine.maxWidth){
		this.width = pt.length / 4;
		this.height = 1;
	    } else {
		if((pt.length / 4) % this.engine.maxWidth != 0 || (pt.length / 4) > this.engine.maxWidth * this.engine.maxHeight)
		    throw "Invalid plaintext length " + pt.length + "!";
		this.width = this.engine.maxWidth;
		this.height = pt.length / 4 / this.engine.maxWidth;
	    }
	}

	this._encrypt_pingpong(pt);
    },
    _encrypt_pingpong : function(pt){
	// console.log("encrypting ");
	// console.log(pt);
	this.engine.createTexture("pt", this.width, this.height, pt);
	this.engine.createFramebuffer("fb0", this.width, this.height);
	this.engine.createFramebuffer("fb1", this.width, this.height);
	
	// before rounds		
	this.engine.useFrameBuffer("fb" + this.curfb);
	this.engine.useProgram("beforerounds");
	this.engine.getGL().uniform1f(this.engine.getUniformLocation("u_w"), this.width);
	this.engine.render();
	// console.log(this.engine.readResult());

	// rounds
	this.engine.useProgram("round");
	// we don't need pt texture now
	this.engine.getGL().uniform1f(this.engine.getUniformLocation("u_w"), this.width);
	for(var r = 0; r < 9; r++){
	    this.curfb = 1 - this.curfb;
	    this.engine.useFrameBuffer("fb" + this.curfb);
	    this.engine.useFrameBufferAsTexture("fb" + (1 - this.curfb), "u_blk");
	    this.engine.getGL().uniform1i(this.engine.getUniformLocation("u_r"), r);
	    this.engine.render();
	    // console.log(this.engine.readResult());
	}

	// after round functions
	this.curfb = 1 - this.curfb;
	this.engine.useFrameBuffer("fb" + this.curfb);
	this.engine.useFrameBufferAsTexture("fb" + (1 - this.curfb), "u_blk");
	this.engine.useProgram("afterrounds");
	this.engine.getGL().uniform1f(this.engine.getUniformLocation("u_w"), this.width);
	this.engine.render();

	// do some cleanups
	this.engine.useFrameBufferAsTexture("fb0", null);
	this.engine.useFrameBufferAsTexture("fb1", null);
    },
    sbox : new Uint8Array([99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,
			   118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,
			   147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,
			   7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,
			   47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,
			   251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,
			   188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,
			   100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,
			   50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,
			   78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,
			   116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,
			   158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,
			   137,13,191,230,66,104,65,153,45,15,176,84,187,22])
}
