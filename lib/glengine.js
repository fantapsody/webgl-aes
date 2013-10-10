/*
  Dependance: jquery.min.js
  
*/

GLEngine = function(canvas){
    this.initGL(canvas);

    var gl = this.gl;
    this.vShader = this.createShader(this.defaultVshader, gl.VERTEX_SHADER);
    if(!this.vShader)
	throw "Failed to create the vertex shader!";
    
    if(!this.initCommonBuffers()){
	throw "Failed to initialize common buffers!";
    }
    
    return true;
}

GLEngine.prototype = {
    precision : "mediump",
    canvas : null,
    ctx : null,
    gl : null,
    bufferVertex : null,
    bufferIndex : null,
    vShaderSrc : null,
    vShader : null,
    framebuffers : new Array(),
    textures : new Array(),
    programs : new Array(),
    locations : new Array(),
    curProgramHolder : null,
    curFramebufferHolder : null,
    initGL : function(canvas){
	if(canvas)
	    this.canvas = canvas;
	else
	    this.canvas = document.createElement("canvas");
	var gl = this.canvas.getContext("experimental-webgl", {preserveDrawingBufer : true});
	if(!gl){
	    throw "Could not get the WebGL context! The browser may do not support WebGL!";
	}
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.STENCIL_TEST);
	gl.disable(gl.DITHER);
	gl.disable(gl.BLEND);
	gl.disable(gl.SCISSOR_TEST);
	this.gl = gl;
    },
    getGL : function(){
	return this.gl;
    },
    getCanvas : function(){
	return this.canvas;
    },
    // functions for manipulating framebuffers
    createFramebuffer : function(name, width, height){
	var holder = this.framebuffers[name];
	var gl = this.gl;
	if(holder){
	    if(holder.width == width && holder.height == height)
		return true;
	    gl.deleteFramebuffer(holder.framebuffer);
	    gl.deleteTexture(holder.texture);
	    if(holder == this.curFramebufferHolder)
		this.curFramebufferHolder = null;
	}
	var framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	var frameTexture = this.createTexture(null, width, height, null);
	gl.bindTexture(gl.TEXTURE_2D, frameTexture);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	this.framebuffers[name] = new FramebufferHolder(name, width, height, framebuffer, frameTexture);
	return true;
    },
    useFrameBuffer : function(name){
	var gl = this.gl;
	if(this.curFramebufferHolder != null && this.curFramebufferHolder == this.framebuffers[name])
	    return true;
	var holder = this.framebuffers[name];
	if(!holder)
	    return false;
	this.curFramebufferHolder = holder;
	gl.bindFramebuffer(gl.FRAMEBUFFER, holder.framebuffer);
	gl.viewport(0, 0, holder.width, holder.height);
	// console.log("framebuffer size: (" + holder.width + "," + holder.height + ")");
	return true;
    },
    useFrameBufferAsTexture : function(name, alias){
	var holder = this.framebuffers[name];
	if(!holder)
	    return false;
	holder.useAsTexture(alias);
    },
    initCommonBuffers : function(){
	var gl = this.gl;
	if(!gl)
	    return false;
	this.bufferVertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertex);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1.0, -1.0,
	    1.0, -1.0, 
	    1.0, 1.0,
		-1.0, 1.0,
	]), gl.STATIC_DRAW);
	this.bufferVertex.size = 2;
	this.bufferVertex.items = 4;

	this.bufferIndex = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndex);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
	    0, 1, 2,
	    0, 2, 3,
	]), gl.STATIC_DRAW);
	this.bufferIndex.size = 1;
	this.bufferIndex.items = 6;

	return true;
    },
    loadUrl : function(url){
	var code = null;
	$.ajax({
	    async : false,
	    url : url,
	    success : function(data){
		code = data;
 	    },
	    error : function(jqXHR, textStatus, errorThrown){
		var err = "Could not load " + url + "!\n" + textStatus + "\n" + errorThrown;
		throw err;
	    },
	    dataType : "html"
	});
	return code;
    },
    loadUrls : function(urls){
	if(!(urls instanceof Array)){
	    urls = [urls];
	}
	var src = "precision " + this.precision + " float;\n";
	for(var i in urls){
	    var str = this.loadUrl(urls[i]);
	    if(!str)
		throw "Cannot load shader from " +  url;
	    src += str;
	}
	return src;
    },
    // functions about shaders and program
    createShader : function(src, type){
	var gl = this.gl;
	if(!gl)
	    return false;
	var shader = gl.createShader(type);
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
	    throw "Cannot create shader: " + gl.getShaderInfoLog(shader) + "\n" + src;
	    return false;
	}
	
	return shader;
    },
    createProgramFromUrls : function(options){
	var gl = this.gl;
	if(!options || !options.fragmentShaderUrl || !options.programName)
	    throw "invalid argument(s)!";
	
	// create the fragment shader
	var src = "precision " + this.precision + " float;\n";
	var urls = null;
	if(options.fragmentShaderUrl instanceof Array)
	    urls = options.fragmentShaderUrl;
	else
	    urls = [options.fragmentShaderUrl];

	for(var i in urls){
	    var str = this.loadUrl(urls[i]);
	    if(!str)
		throw "Cannot load shader from " +  url;
	    src += str;
	}
	return this.createProgram(options.programName, src);
    },
    createProgram : function(programName, src){
	var gl = this.gl;
	var fShader = this.createShader(src, gl.FRAGMENT_SHADER);

	var program = gl.createProgram();
	
	// use the default vertex shader
	gl.attachShader(program, this.vShader);
	gl.attachShader(program, fShader);
	gl.linkProgram(program);
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
	    throw "Cannot link the program! " + gl.getProgramInfoLog(program);
	    return false;
	}
	this.programs[programName] = new ProgramHolder(programName, program);
	return true;
    },
    useProgram : function(pname){
	if(!pname)
	    return false;
	if(this.curProgramHolder != null && this.curProgramHolder.name == pname)
	    return true;
	if(!this.programs[pname])
	    return false;
	else{
	    this.curProgramHolder = this.programs[pname];
	    this.gl.useProgram(this.curProgramHolder.program);
	    return true;
	}
    },
    getAttribLocation : function(name){
	var locs = this.locations[this.curProgramHolder.name];
	var loc = null;
	if(!locs){
	    this.locations[this.curProgramHolder.name] = locs = new Array();
	} else {
	    locs = this.locations[this.curProgramHolder.name];
	}
	loc = locs[name];
	if(!loc){
	    loc = locs[name] = this.gl.getAttribLocation(this.curProgramHolder.program, name);
	}
	return loc;
    },
    getUniformLocation : function(name){
	var locs = this.locations[this.curProgramHolder.name];
	var loc = null;
	if(!locs){
	    this.locations[this.curProgramHolder.name] = locs = new Array();
	} else {
	    locs = this.locations[this.curProgramHolder.name];
	}
	loc = locs[name];
	if(!loc){
	    loc = locs[name] = this.gl.getUniformLocation(this.curProgramHolder.program, name);
	}
	return loc;
    },
    // functions manipulating textures
    createTexture : function(name, width, height, data, format){
	var gl = this.gl;
	var texture = null;
	var holder = null;

	if(!format)
	    format = gl.RGBA;

	if(name){
	    holder = this.textures[name];
	}

	if(holder){
	    holder.enable();
	    if(holder.width == width && holder.height == height)
		texture = holder.texture;
	    else
		gl.deleteTexture(holder.texture);
	}

	if(!texture){
	    texture = gl.createTexture();
	    if(holder){
		holder.texture = texture;
		holder.width = width;
		holder.height = height;
	    } else if(name){
		holder = this.textures[name] = new TextureHolder(name, texture, width, height);
	    }
	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, data);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return texture;
    },
    enableTexture : function(name){
	this.textures[name].enable();
    },
    disableTexture : function(name){
	this.textures[name].disable();
    },		
    render : function(textureEnabled){
	var gl = this.gl;

	gl.clear(gl.COLOR_BUFFER_BIT);

	// bind vertex and index buffers
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertex);
	gl.enableVertexAttribArray(this.getAttribLocation("a_position"));
	gl.vertexAttribPointer(this.getAttribLocation("a_position"), this.bufferVertex.size, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndex);

	var i = 0;
	for(var name in this.textures){
	    var holder = this.textures[name];
	    if(!holder.isEnabled())
		continue;
	    gl.activeTexture(gl["TEXTURE" + i]);
	    gl.bindTexture(gl.TEXTURE_2D, holder.texture);
	    var loc = this.gl.getUniformLocation(this.curProgramHolder.program, "u_" + name);
	    gl.uniform1i(loc, i);
	    i++;
	}

	for(var name in this.framebuffers){
	    var holder = this.framebuffers[name];
	    if(holder == this.curFramebufferHolder || !holder.alias)
		continue;

	    gl.activeTexture(gl["TEXTURE" + i]);
	    gl.bindTexture(gl.TEXTURE_2D, holder.texture);
	    var loc = this.gl.getUniformLocation(this.curProgramHolder.program, holder.alias);
	    gl.uniform1i(loc, i);
	    i++;
	}
	
	gl.drawElements(gl.TRIANGLES, this.bufferIndex.items, gl.UNSIGNED_SHORT, 0);
    },
    readResult : function(result){
	var gl = this.gl;
	// console.log("(" + this.curFramebufferHolder.width + "," + this.curFramebufferHolder.height + ")");
	if(!result)
	    result = new Uint8Array(4 * this.curFramebufferHolder.width * this.curFramebufferHolder.height);
	gl.readPixels(0, 0, this.curFramebufferHolder.width, this.curFramebufferHolder.height, gl.RGBA, gl.UNSIGNED_BYTE, result);
	return result;
    },
    renderToDrawbuffer : function(fb_name){
	if(!this.programs["toDrawbuffer"]){
	    this.createProgram("toDrawbuffer", this.defaultFshader);
	}
	this.useProgram("toDrawbuffer");
	var gl = this.gl;
	var holder = this.framebuffers[fb_name];
	if(!holder)
	    throw "Invalid framebuffer name " + fb_name + " !";
	this.canvas.width = holder.width;
	this.canvas.height = holder.height;
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	gl.clear(gl.COLOR_BUFFER_BIT);

	// bind vertex and index buffers
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertex);
	gl.enableVertexAttribArray(this.getAttribLocation("a_position"));
	gl.vertexAttribPointer(this.getAttribLocation("a_position"), this.bufferVertex.size, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndex);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, holder.texture);
	var loc = this.gl.getUniformLocation(this.curProgramHolder.program, holder.alias);
	gl.uniform1i(loc, 0);

	gl.drawElements(gl.TRIANGLES, this.bufferIndex.items, gl.UNSIGNED_SHORT, 0);
    },
    defaultVshader : "attribute vec2 a_position;\n" +
	"varying vec2 v_texcoord;\n" + 
	"void main(){\n" +
	"v_texcoord = a_position + vec2(1.0, 1.0);" +
	"v_texcoord = v_texcoord / vec2(2.0, 2.0);" +
	"gl_Position = vec4(a_position.x, a_position.y, 0, 1.0);" +
	"}",
    defaultFshader : "precision mediump float;\n" +
	"varying vec2 v_texcoord;\n" +
	"uniform sampler2D u_fb;\n" +
	"void main(){\n" +
	"gl_FragColor = texture2D(u_fb, v_texcoord);\n" +
	"}",    
    maxWidth : 1024,
    maxHeight : 1024
}

ProgramHolder = function(name, program){
    this.name = name;
    this.program = program;
}

TextureHolder = function(name, texture, width, height){
    this.name = name;
    this.texture = texture;
    this.width = width;
    this.height = height;
}

TextureHolder.prototype = {
    enabled : true,
    enable : function(){
	this.enabled = true;
    },
    disable : function(){
	this.enabled = false;
    },
    isEnabled : function(){
	return this.enabled;
    }
}

FramebufferHolder = function(name, width, height, framebuffer, texture){
    this.name = name;
    this.width = width;
    this.height = height;
    this.framebuffer = framebuffer;
    this.texture = texture;
    this.alias = null;
}

FramebufferHolder.prototype = {
    useAsTexture : function(alias){
	this.alias = alias;
    }
}
