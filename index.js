function Sprite(_url, _file) {
	this.img = new Image();
	this.img.src = _url;
	this.name = _file.name;
}

Sprite.prototype.trimTransparency = function() {
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	canvas.width = this.img.width;
	canvas.height = this.img.height;
	ctx.drawImage(this.img, 0, 0);

	var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	var start = {
		x: imgData.width,
		y: imgData.height
	};
	var end = {
		x: 0,
		y: 0
	};
	for(var y = 0; y < imgData.height; ++y) {
		for(var x = 0; x < imgData.width; ++x) {
			var a = getPixelValue(imgData, x, y, 3);
			// find first non-transparent pixel from top-left
			if(a > 0 && start.x > x) {
				start.x = x;
			}
			if(a > 0 && start.y > y) {
				start.y = y;
			}
			// find first non-transparent pixel from bottom-right
			if(a > 0 && end.x < x) {
				end.x = x;
			}
			if(a > 0 && end.y < y) {
				end.y = y;
			}
		}
	}

	// resize canvas and draw image from first non-transparent pixel to last
	var size = {
		x: end.x + 1 - start.x,
		y: end.y + 1 - start.y
	};
	canvas.width = size.x;
	canvas.height = size.y;
	ctx.drawImage(this.img, start.x, start.y, size.x, size.y, 0, 0, size.x, size.y);

	// overwrite image with the canvas output
	this.img.src = canvas.toDataURL();
}

function MyApp() {
}

MyApp.prototype.onImageLoaded = function(event) {
	var sprite = new Sprite(event.target.result, event.target.file);
	this.sprites.push(sprite);

	var img = document.createElement("div");
	img.style.backgroundImage = "url('" + sprite.img.src + "')";
	var span = document.createElement("span");
	span.innerHTML = sprite.name;

	var li = document.createElement("li");
	var butt = document.createElement("button");
	butt.innerHTML = "X";
	butt.onclick = this.removeSprite.bind(this, sprite);
	li.appendChild(img);
	li.appendChild(span);
	li.appendChild(butt);
	document.getElementById("file-list").appendChild(li);
}
MyApp.prototype.removeSprite = function(_sprite) {
	var idx = this.sprites.indexOf(_sprite);
	var fileList = document.getElementById("file-list");
	fileList.removeChild(fileList.childNodes[idx]);
	this.sprites.splice(idx, 1);
}

MyApp.prototype.init = function() {
	// check for API support
	var errors = [];
	if(!window.File){
		errors.push("HTML5 File API");
	}if(!window.FileReader) {
		errors.push("HTML5 FileReader API");
	}if(!document.createElement('canvas').getContext) {
		errors.push("HTML5 Canvas");
	}

	if(errors.length == 0){
		this.appName = "test";
		this.sprites = [];
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.ctx.imageSmoothingEnabled = false;

		document.getElementById("files").onchange = this.handleFileSelect.bind(this);
		document.getElementById("output-json").onclick = function(event){
			this.focus();
			this.select()
		};document.getElementById("go-button").onclick = function(event){

			// make sure there are actually sprites
			if(this.sprites.length == 0) {
				document.getElementById("output-img").src = "no_img.png";
				document.getElementById("output-json").innerHTML = "[]";
			}else{
				this.trimTransparency();
				this.layout();
				document.getElementById("go-button").disabled = true;
			}
		}.bind(this);


		document.addEventListener("complete", function(event){
			document.getElementById("sprite-best").innerHTML = document.getElementById("sprite-count").innerHTML;

			console.log("complete");

			// clear out the info in the workspace
			if(!this.debug){
				this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
			}

			// replace workspace with actual sprites
			for(var i = 0; i < event.detail.length; ++i) {
				var entry = event.detail[i];
				event.detail[i].id = this.sprites[event.detail[i].idx].name;
				this.ctx.drawImage(this.sprites[event.detail[i].idx].img, entry.x, entry.y);
				delete event.detail[i].idx; // delete the now-irrelevant value from the json
			}

			// copy workspace and json to output area
			document.getElementById("output-img").src = document.getElementById("download-link").href = this.canvas.toDataURL();
			document.getElementById("output-json").innerHTML = JSON.stringify(event.detail);

			document.getElementById("go-button").disabled = false;
		}.bind(this));

		document.addEventListener("layoutIteration", function(event){
			var f = this.layoutIteration.bind(this);
			window.setTimeout(function(){
				f(event);
			},1);
		}.bind(this));

		console.log("initialized");
	}else{
		var s = "<h1>Sorry!</h1><p>Your browser doesn't support the following required features:</p><ul>";
		for(var i = 0; i < errors.length; ++i){
			s += "<li>" + errors[i] + "</li>";
		}
		s += "</ul><p>Try switching to an up-to-date version of Google Chrome or Mozilla Firefox to use this web app.</p></section>";
		document.getElementById("main").innerHTML = s;
		console.log("initialization failed");
	}
}
MyApp.prototype.loadImage = function(file) {
	var reader = new FileReader();
	reader.file = file;
	reader.onload = this.onImageLoaded.bind(this);
	reader.readAsDataURL(file);
}
MyApp.prototype.handleFileSelect = function(event) {
	event.stopPropagation();
	event.preventDefault();

	var files = event.target.files;
	var output = [];
	for(var i = 0; i < files.length; ++i) {
		var f = files[i];
		this.loadImage(f);
	}
}
MyApp.prototype.trimTransparency = function() {
	for(var i = 0; i < this.sprites.length; ++i) {
		this.sprites[i].trimTransparency();
	}
}
MyApp.prototype.spriteSort = function(a, b) {
	return b.h - a.h;
}
MyApp.prototype.layout = function() {

	// get settings
	this.powerOfTwo = document.getElementById("powerOfTwo").checked;
	this.grid = document.getElementById("grid").checked;
	this.debug = document.getElementById("debug").checked;

	this.padding = parseInt(document.getElementById("padding").value, 10);

	// save width/height on sprites
	// and get maximum sprite dimension
	var sprites = [];
	for(var i = 0; i < this.sprites.length; ++i){
		sprites.push({
			idx: i,
			w: this.sprites[i].img.width,
			h: this.sprites[i].img.height
		});
	}

	// calculate total area covered by sprites
	var area = 0;
	this.maxW = this.maxH = 0;
	for(var i = 0; i < sprites.length; ++i) {
		area += sprites[i].w * sprites[i].h;
		this.maxW = Math.max(this.maxW, sprites[i].w);
		this.maxH = Math.max(this.maxH, sprites[i].h);
	}
	var size = Math.max(this.maxW,this.maxH);
	// resize and clear workspace canvas
	// start with a square with at least enough area for every sprite
	// (no point trying to arrange within an area which is too small)
	this.canvas.width = 1;
	while(
		this.canvas.width * this.canvas.width < area ||
		this.canvas.width < size+this.padding*2
		) {
		this.canvas.width += this.powerOfTwo ? this.canvas.width : 1;
	}
	this.canvas.height = this.canvas.width;
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	document.getElementById("sprite-current").innerHTML = 0;
	document.getElementById("sprite-best").innerHTML = 0;
	document.getElementById("sprite-count").innerHTML = this.sprites.length.toString();
	document.getElementById("attempt").innerHTML = 1;
	document.getElementById("canvas-size").innerHTML = this.canvas.width+"x"+this.canvas.height;

	// layout
	if(!this.grid) {
		// sort sprites by area
		sprites.sort(this.spriteSort);
	}
	window.setTimeout(function(){
		var event = new CustomEvent("layoutIteration", {detail:{sprites:sprites, idx:0, output:[]}});
		document.dispatchEvent(event);
	},1);
}
MyApp.prototype.layoutIteration = function(event) {
	var detail = event.detail;

	document.getElementById("sprite-current").innerHTML = detail.idx+1;

	var sprite = detail.sprites[detail.idx];
	var start = {
		x: this.padding,
		y: this.padding
	};
	var w = this.grid ? this.maxW : sprite.w;
	var h = this.grid ? this.maxH : sprite.h;

	var imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
	var valid = false;
	do {
		outer_loop:
			for(var y = start.y; y < this.canvas.height - h; ++y) {
				for(var x = this.padding; x < this.canvas.width - w; ++x) {
					if(getPixelValue(imgData, x, y, 3) == 0) {
						start.x = x;
						start.y = y;
						valid = true;
						break outer_loop;
					}
				}
			}

		// if we couldn't find an open pixel, increase the workspace and start over
		if(!valid) {
			if(this.powerOfTwo) {
				// if power of two, double
				this.canvas.width *= 2;
				this.canvas.height *= 2;
			} else {
				// if not power of two, increase by one
				this.canvas.width += 1;
				this.canvas.height += 1;
			}
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			i = -1;
			window.setTimeout(function(){
				document.getElementById("attempt").innerHTML = parseInt(document.getElementById("attempt").innerHTML, 10) + 1;
				document.getElementById("sprite-best").innerHTML = Math.max(parseInt(document.getElementById("sprite-best").innerHTML, 10), detail.idx);
				document.getElementById("canvas-size").innerHTML = this.canvas.width+"x"+this.canvas.height;
				detail.idx = 0;
				detail.output = [];
				var event = new CustomEvent("layoutIteration", {detail:detail});
				document.dispatchEvent(event);
			}.bind(this),50);
			return;
		}


		// check if the sprite would overlap with anything in the workspace if placed at the given location
		valid = true;
		outer_loop:
		for(var y = 0; y < h + this.padding; ++y) {
			for(var x = 0; x < w + this.padding; ++x) {
				if(getPixelValue(imgData, start.x + x, start.y + y, 3) != 0) {
					valid = false;
					// move one down and all the way to the left
					start.y += 1;
					break outer_loop;
				}
			}
		}
	} while (!valid);

	// draw a rectangle where the sprite will be placed
	this.ctx.fillStyle = 'rgb(255,' + Math.floor(Math.random() * 256) + ',' + Math.floor(Math.random() * 256) + ')';
	this.ctx.fillRect(start.x, start.y, w, h);

	if(this.padding > 0) {
		this.ctx.lineWidth = this.padding;
		this.ctx.strokeRect(start.x - this.padding / 2, start.y - this.padding / 2, w + this.padding, h + this.padding);
	}
	// save the sprite entry into output
	var outputEntry = {
		idx: sprite.idx,
		x: start.x,
		y: start.y,
		w: sprite.w,
		h: sprite.h
	};
	detail.output.push(outputEntry);

	if(detail.idx < detail.sprites.length-1){
		// next iteration
		detail.idx += 1;
		var event = new CustomEvent("layoutIteration", {detail:detail});
		document.dispatchEvent(event);
	}else{
		// complete
		var event = new CustomEvent("complete", {detail:detail.output});
		document.dispatchEvent(event);
	}
}

// returns the value of _data[(_y*_data.width + _x)*4 + _c]
function getPixelValue(_data, _x, _y, _c) {
	return _data.data[(_y * _data.width + _x) * 4 + _c];
}