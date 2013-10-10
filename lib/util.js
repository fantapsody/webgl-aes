function bytesToWords(arr){
    console.assert(arr.length % 4 == 0);
    var ret = new Array(arr.length / 4);
    for(var i = 0; i < arr.length / 4; i++){
	ret[i] = arr[i * 4 + 3] | (arr[i * 4 + 2] << 8) | (arr[i * 4 + 1] << 16) | (arr[i * 4] << 24);
    }
    return ret;
}

function wordsToBytes(arr){
    var ret = new Uint8Array(arr.length * 4);
    for(var i = 0; i < arr.length; i++){
	ret[i * 4] = arr[i] >>> 24;
	ret[i * 4 + 1] = (arr[i] >>> 16) & 0xff;
	ret[i * 4 + 2] = (arr[i] >>> 8) & 0xff;
	ret[i * 4 + 3] = arr[i] & 0xff;
    }
    return ret;
}

function uarrayToArray(ua){
    var ret = new Array();
    for(var i = 0; i < ua.length; i++){
	ret.push(ua[i]);
    }
    return ret;
}

// generate a ctr array in little endian mode
function generateCTRSeq(iv, l){
    var ctr = new Uint8Array(l);
    iv = iv >>> 0;
    for(var i = 0; i < l;){
	t = iv;
	ctr[i++] = t & 0xff;
	t = t >>> 8;
	ctr[i++] = t & 0xff;
	t = t >>> 8;
	ctr[i++] = t & 0xff;
	t = t >>> 8;
	ctr[i++] = t & 0xff;
	iv += 1;
    }
    return ctr;
}

function sjclEncryptCTR(sjclaes, pt, ctr, ct){
    if(!ct)
	throw "No CTR array!";
    var actr = bytesToWords(ctr);
    for(var i = 0; i < actr.length; i += 4){
	ct.set(wordsToBytes(sjclaes.encrypt(actr.slice(i, i + 4))), i * 4);
    }
    for(var i = 0; i < pt.length; i++){
	ct[i] ^= pt[i];
    }
    return ct;
}
