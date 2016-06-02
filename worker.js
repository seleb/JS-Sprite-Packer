self.addEventListener("message", function(event){
	self.postMessage({cmd:"msg", data:event.data});
	self.postMessage({cmd:"msg", data:event.data[0].img.width});
	self.postMessage({cmd:"complete", data:null});
}, false);
