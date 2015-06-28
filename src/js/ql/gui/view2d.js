"use strict";


if(typeof QL === "undefined"){ var QL = {}; }
if(typeof QL.gui === "undefined"){ QL.gui = {}; }

function drawLine(ctx, start, finish, dash, stroke){
	ctx.beginPath();
	ctx.moveTo(start[0],start[1]);
	ctx.lineTo(finish[0],finish[1]);
	ctx.setLineDash(dash);
	ctx.strokeStyle = stroke;
	ctx.stroke();
}

function drawRect(ctx, _obj){
	var center = [
		ctx.canvas.width/2,
		ctx.canvas.height/2
	]

	var start = [
		center[0]+_obj.start[0],
		center[1]+_obj.start[1]
	]

	var finish = [
		_obj.finish[0]-_obj.start[0],
		_obj.finish[1]-_obj.start[1]
	]

	ctx.beginPath();
	ctx.rect(start[0],start[1],finish[0],finish[1]);
	ctx.strokeStyle = '#777';
	ctx.setLineDash([0]);
	ctx.stroke();
}

function drawSquare(ctx, _obj){
	var center = [
		ctx.canvas.width/2,
		ctx.canvas.height/2
	]

	var start = [
		center[0]+_obj.position[0]-_obj.size/2,
		center[1]+_obj.position[1]-_obj.size/2,
	]

	var finish = [
		center[0]+_obj.position[0]+_obj.size/2-start[0],
		center[1]+_obj.position[1]+_obj.size/2-start[1],
	]
	ctx.beginPath();
	ctx.rect(start[0], start[1], finish[0], finish[1]);
	ctx.strokeStyle = '#777';
	ctx.setLineDash([0]);
	ctx.stroke();
}

function drawHorizontalLines(ctx){
	drawLine(ctx, [
		0, ctx.canvas.height/2
	],[
		ctx.canvas.width, ctx.canvas.height/2
	],[0],'#96DC96')

	var step = 10;

	for(var yPos = ctx.canvas.height/2-step; yPos > 0; yPos-=step){
		drawLine(ctx, [
			0, yPos
		],[
			ctx.canvas.width, yPos
		],[0],'#333')
	}

	for(var yPos = ctx.canvas.height/2+step; yPos < ctx.canvas.height; yPos+=step){
		drawLine(ctx, [
			0, yPos
		],[
			ctx.canvas.width, yPos
		],[0],'#333')
	}
}

function drawVerticalLines(ctx){
	drawLine(ctx, [
		ctx.canvas.width/2, 0
	],[
		ctx.canvas.width/2, ctx.canvas.height
	],[0],'#96DC96')

	var step = 10;

	for(var xPos = ctx.canvas.width/2-step; xPos > 0; xPos-=step){
		drawLine(ctx, [
			xPos, 0
		],[
			xPos, ctx.canvas.height
		],[0],'#333')
	}

	for(var xPos = ctx.canvas.width/2+step; xPos < ctx.canvas.width; xPos+=step){
		drawLine(ctx, [
			xPos, 0
		],[
			xPos, ctx.canvas.height
		],[0],'#333')
	}

}

QL.gui.View2D = function(_conf, _scene, _editor){
	this.canvas = $(_conf.canvas)[0];
	this.ctx = this.canvas.getContext("2d");
	this.perspective = _conf.perspective;
	this.center = [
		this.ctx.canvas.width/2,
		this.ctx.canvas.height/2
	]

	this.mod = {
		x: 0, xD: 1,
		y: 1, yD: -1,
		u: "x",
		v: "y"
	}

	switch(this.perspective){
		case "top":
			this.mod.x = 0;
			this.mod.y = 2;
			this.mod.u = "x";
			this.mod.v = "z";
			this.mod.z = "y";
			this.mod.yD = 1;
			break;
		case "front":
			this.mod.x = 0;
			this.mod.y = 1;
			this.mod.u = "x";
			this.mod.v = "y";
			this.mod.z = "z";
			break;
		case "side":
			this.mod.x = 2;
			this.mod.y = 1;
			this.mod.u = "z";
			this.mod.v = "y";
			this.mod.z = "x";
			this.mod.xD = -1;
			break;
	}

	this.hitAreas = [];

	this.scene = _scene;
	this.editor = _editor

	var _view = this;

	// mouse manipulations
	// select
	$(this.canvas).click(function(ev){
		
		var hitPos = [
			ev.offsetX,
			ev.offsetY
		]

		var oldId = false;
		if(typeof _view.scene.selected !== "undefined" && _view.scene.selected !== false){
			oldId = _view.scene.selected.id;
		}

		var selectedObj = false;
		var hits = 0;
		_view.hitAreas.forEach(function(hitArea){
			if((hitArea.start[0] <= hitPos[0] && hitPos[0] <= hitArea.finish[0])
			   && (hitArea.start[1] <= hitPos[1] && hitPos[1] <= hitArea.finish[1])
			) {
				hits++;

				var hitObj = _view.scene.getObjectById(hitArea.objId);
				if(!selectedObj || hitObj.position[_view.mod.z] > selectedObj.position[_view.mod.z]){
					
					if(hitArea.objId === oldId)
						return true;
					selectedObj = hitObj;
				}
			}
		})

		_view.editor.select(selectedObj.id);
		

	})

	this.operation = "idle"
	this.dragStartPos = [];
	this.dragPos = [];
	this.dragOffset = [];
	// mouse move
	$(this.canvas).mousedown(function(ev){
		_view.operation = "dragstart";
		_view.dragStartPos = _view.dragPos = [
			ev.offsetX,
			ev.offsetY
		]
		if(_view.scene.selected){
			var pos = [
				_view.scene.selected.position[_view.mod.u],
				_view.scene.selected.position[_view.mod.v]
			]
			_view.dragOffset = [
				pos[0],
				pos[1]
			]
		}
	});

	$(this.canvas).mousemove(function(ev){
		if(["dragstart","dragging"].indexOf(_view.operation)>-1){
			_view.operation = "dragging";

			_view.dragPos = [
				ev.offsetX,
				ev.offsetY
			]
			var dragVector = [
				_view.dragPos[0]-_view.dragStartPos[0],
				_view.dragPos[1]-_view.dragStartPos[1]
			]
			if(_view.scene.selected){
				if(dragVector[0]/5 === parseInt(dragVector[0]/5))
					_view.scene.selected.position[_view.mod.u] = (_view.mod.xD*dragVector[0])+_view.dragOffset[0];
				if(dragVector[1]/5 === parseInt(dragVector[1]/5))
					_view.scene.selected.position[_view.mod.v] = (_view.mod.yD*dragVector[1])+_view.dragOffset[1];
			}
			
		}
	})

	$(this.canvas).mouseup(function(ev){
		_view.operation="idle";
		_view.dragStartPos = [];
		_view.dragPos = [];
		_view.dragOffset = [];
	})
	
}

QL.gui.View2D.prototype.drawCube = function(_obj){
	
	var start = [
		this.center[0]+this.mod.xD*(_obj.position[this.mod.x]-_obj.size/2),
		this.center[1]+this.mod.yD*(_obj.position[this.mod.y]-_obj.size/2),
	]

	var finish = [
		this.center[0]+this.mod.xD*(_obj.position[this.mod.x]+_obj.size/2)-start[0],
		this.center[1]+this.mod.yD*(_obj.position[this.mod.y]+_obj.size/2)-start[1],
	]

	this.ctx.beginPath();
	this.ctx.rect(start[0], start[1], finish[0], finish[1]);
	this.ctx.strokeStyle = '#777';
	this.ctx.setLineDash([0]);
	this.ctx.stroke();

}

QL.gui.View2D.prototype.drawBlock = function(_obj){

	var start = [
		this.center[0]+this.mod.xD*(_obj.start[this.mod.x]),
		this.center[1]+this.mod.yD*(_obj.start[this.mod.y])
	]

	var finish = [
		this.mod.xD*(_obj.finish[this.mod.x]-_obj.start[this.mod.x]),
		this.mod.yD*(_obj.finish[this.mod.y]-_obj.start[this.mod.y])
	]

	this.ctx.beginPath();
	this.ctx.rect(start[0],start[1],finish[0],finish[1]);
	this.ctx.strokeStyle = '#777';
	this.ctx.setLineDash([0]);
	this.ctx.stroke();
}

QL.gui.View2D.prototype.drawBox = function(_obj, _strokeStyle){

	var _mod = this.mod;
	var that = this;

	//console.log(_obj)

	_obj.geometry.quads.forEach(function(_quad, index){

		//if(index == 4){

			//console.log(_quad);

			var start = [
				that.center[0]+_mod.xD*(_obj.position[_mod.u]+_quad.a[_mod.u]),
				that.center[1]+_mod.yD*(_obj.position[_mod.v]+_quad.a[_mod.v])
			]

			var finish = [
				_mod.xD*(_quad.d[_mod.u]-_quad.a[_mod.u]),
				_mod.yD*(_quad.d[_mod.v]-_quad.a[_mod.v])
			]

			var end = [
				start[0]+finish[0],
				start[1]+finish[1]
			]

			if(finish[0]!=0 && finish[1]!=0){
				that.ctx.beginPath();
				that.ctx.rect(start[0],start[1],finish[0],finish[1]);

				that.hitAreas.push({
					start: [
						((start[0]<end[0]) ? start[0] : end[0]),
						((start[1]<end[1]) ? start[1] : end[1])
					],
					finish: [
						((start[0]>end[0]) ? start[0] : end[0]),
						((start[1]>end[1]) ? start[1] : end[1])
					],
					objId: _obj.id
				})

				that.ctx.strokeStyle = _strokeStyle || '#555';
				var baseColor = new THREE.Color(0x555555);
				/*if(_obj.selected){
					that.ctx.strokeStyle = "#DC3333";
				}*/

				that.ctx.setLineDash([0]);
				that.ctx.stroke();
			}
		//}

	})



}

QL.gui.View2D.prototype.refresh = function(_entities){
	this.canvas.width = $(this.canvas.parentNode).width()/2;
	this.canvas.height = $(this.canvas.parentNode).height()/2;
	// draw lines in the middle
	drawHorizontalLines(this.ctx)
	drawVerticalLines(this.ctx)

	// draw text
	this.ctx.font="16px Arial";
	this.ctx.fillStyle="#999";
	this.ctx.fillText(this.perspective,15,25);


	this.center = [
		this.ctx.canvas.width/2,
		this.ctx.canvas.height/2
	]

	this.hitAreas = [];

	var that = this;

	/*
	_entities.forEach(function(_obj){
		switch(_obj.type){
			case "cube":
				that.drawCube(_obj);
				break;
			case "block":
				that.drawBlock(_obj);
				break;
		}
	})
*/

	this.scene.children.forEach(function(_obj){
		if(_obj.type === "Mesh"){
			switch(_obj.geometry.type){
				case "BoxGeometry":
					that.drawBox(_obj);
				break;
			}
		}
	})

	// draw the selected again
	if(this.scene.selected){
		that.drawBox(this.scene.selected,"#DC3333");
	}
}