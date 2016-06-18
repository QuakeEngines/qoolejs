'use strict';

import THREE from 'three';
import {Observable as $} from 'rx-lite';
import _ from 'lodash';

import iblokz from '../../iblokz';
import ext from '../ext';
import Element from './element';

var View2D = function(_conf, _scene, _editor){

	Element.call(this, _conf.dom);
	//this.ctx = this.canvas.getContext("2d");

	let dom = (typeof this.dom === 'string')
		? document.querySelector(this.dom)
		: this.dom;

	this.layers = {
		grid: new iblokz.gui.Grid(dom.querySelector('.grid-layer')),
		scene: new iblokz.gui.Canvas(dom.querySelector('.scene-layer')),
		selection: new iblokz.gui.Canvas(dom.querySelector('.selection-layer')),
		indicators: new iblokz.gui.Canvas(dom.querySelector('.indicators-layer'))
	};

	this.toBeRefreshed = ["grid", "scene", "selection", "indicators"];

	this.perspective = _conf.perspective;

	this.center = new ext.Vector2(
		dom.clientWidth/2,
		dom.clientHeight/2
	);

	this.zoom = 100;
	this.offset = new ext.Vector2(0,0);

	this.mod = {
		x: 0, xD: 1,
		y: 1, yD: -1,
		zD: 1,
		u: "x",
		v: "y"
	};

	switch(this.perspective){
		case "top":
			this.mod.x = 0;
			this.mod.y = 2;
			this.mod.z = 1;
			this.mod.u = "x";
			this.mod.v = "z";
			this.mod.w = "y";
			this.mod.yD = 1;
			break;
		case "front":
			this.mod.x = 0;
			this.mod.y = 1;
			this.mod.z = 2;
			this.mod.u = "x";
			this.mod.v = "y";
			this.mod.w = "z";
			break;
		case "side":
			this.mod.x = 2;
			this.mod.y = 1;
			this.mod.z = 0;
			this.mod.u = "z";
			this.mod.v = "y";
			this.mod.w = "x";
			this.mod.xD = -1;
			break;
	}

	this.hitFaces = [];
	this.selected = false;

	this.scene = _scene;
	this.editor = _editor;

	var _view = this;

	// mouse manipulations
	// select
	var handleSelect = function(ev){

		var hitPos = new ext.Vector2(
			ev.offsetX,
			ev.offsetY
		);

		var old = _.clone(_view.selected);

		var selected = false;
		var hits = 0;
		_view.hitFaces.forEach(function(hitFace){
			if(hitFace.triangle.containsPoint(hitPos.toVector3(_view.mod))) {
				hits++;

				if(selected === false || hitFace.position[_view.mod.w] > selected.position[_view.mod.w]){

					if(hitFace.objId === old.objId)
						return true;

					selected = _.clone(hitFace);
				}
			}
		});

		_view.editor.select(selected.objId);
		//this.needRefreshing("scene","interaction");

	};

	this.interaction = {
		status: "idle",
		start: new ext.Vector2(0,0),
		last: new ext.Vector2(0,0),
		button: 0
	}

	// mouse move
	$.fromEvent(dom, 'mousedown').map((ev) => {
		_view.interaction.status = "mousedown";
		_view.interaction.start.set(ev.offsetX, ev.offsetY);
		_view.interaction.last.set(0, 0);
		_view.interaction.button = ev.button;
	}).subscribe();

	$.fromEvent(dom, 'touchstart').map((ev) => {
		var e = ev.originalEvent;
		_view.interaction.status = "mousedown";
		_view.interaction.start.set(e.touches[0].clientX, e.touches[0].clientY);
		_view.interaction.last.set(0, 0);
	}).subscribe();

	$.fromEvent(dom, 'mousemove').map((ev) => {
		if(["mousedown","mousemove"].indexOf(_view.interaction.status)>-1){
			_view.interaction.status = "mousemove";

			var mousePos = new ext.Vector2(ev.offsetX,ev.offsetY);

			var changeVector = mousePos.clone().sub(_view.interaction.start).divideScalar(_view.zoom/100);
			changeVector.x = parseInt(changeVector.x/2.5)*2.5
			changeVector.y = parseInt(changeVector.y/2.5)*2.5
			switch(_view.interaction.button) {

				case 0:
					if(_view.selected === false)
						return;

					var objectChanged = false;

					var interactionVector = changeVector.clone().sub(_view.interaction.last).toVector3(_view.mod);

					switch(_view.editor.params["obj-mode"]){
						case "move":

							//ext.interactor.move(_view.scene.selected, interactionVector);
							_view.editor.interact("move",interactionVector);
							break;
						case "scale":
							interactionVector.z = -interactionVector.z;
							//ext.interactor.scale(_view.scene.selected, interactionVector.divideScalar(10));
							_view.editor.interact("scale",interactionVector.divideScalar(20));
							break;
						case "rotate":

							var oldRotation = _view.scene.selected.rotation.clone();

							var mousePos3 = mousePos.clone().divideScalar(_view.zoom/100).sub(_view.center).toVector3(_view.mod);
							mousePos3[_view.mod.w] = _view.scene.selected.position[_view.mod.w];
							//console.log(mousePos3);
							//ext.interactor.lookAt(_view.scene.selected, mousePos3);
							_view.editor.interact("lookAt",mousePos3);

							break;
					}
					_view.interaction.last = changeVector.clone();
					break;
				case 1:
					_view.offset.sub(changeVector.clone().sub(_view.interaction.last))
					_view.interaction.last = changeVector.clone();
					_view.needRefreshingAll();
					break;

			}

		}
	}).subscribe();

	$.fromEvent(dom, 'touchmove').map((ev) => {
		var e = ev.originalEvent;
		ev.preventDefault();
		if(["mousedown","mousemove"].indexOf(_view.interaction.status)>-1){
			_view.interaction.status = "mousemove";

			var mousePos = new ext.Vector2(e.touches[0].clientX,e.touches[0].clientY);

			var changeVector = mousePos.clone().sub(_view.interaction.start).divideScalar(_view.zoom/100);
			changeVector.x = parseInt(changeVector.x/2.5)*2.5
			changeVector.y = parseInt(changeVector.y/2.5)*2.5
			/*switch(ev.which) {

				case 1:*/
					if(_view.selected === false)
						return;

					var objectChanged = false;

					var interactionVector = changeVector.clone().sub(_view.interaction.last).toVector3(_view.mod);

					switch(_view.editor.params["obj-mode"]){
						case "move":

							//ext.interactor.move(_view.scene.selected, interactionVector);
							_view.editor.interact("move",interactionVector);
							break;
						case "scale":
							interactionVector.z = -interactionVector.z;
							//ext.interactor.scale(_view.scene.selected, interactionVector.divideScalar(10));
							_view.editor.interact("scale",interactionVector.divideScalar(20));
							break;
						case "rotate":

							var oldRotation = _view.scene.selected.rotation.clone();

							var mousePos3 = mousePos.clone().divideScalar(_view.zoom/100).sub(_view.center).toVector3(_view.mod);
							mousePos3[_view.mod.w] = _view.scene.selected.position[_view.mod.w];
							//console.log(mousePos3);
							//ext.interactor.lookAt(_view.scene.selected, mousePos3);
							_view.editor.interact("lookAt",mousePos3);

							break;
					}
					_view.interaction.last = changeVector.clone();
			/*		break;
				case 2:
					_view.offset.sub(changeVector.clone().sub(_view.interaction.last))
					_view.interaction.last = changeVector.clone();
					_view.needRefreshingAll();
					break;

			}*/

		}
	}).subscribe();

	$.fromEvent(dom, 'mouseup').map((ev) => {
		if(ev.button == 0 &&
			(_view.interaction.status === "mousedown" || _view.interaction.last.toArray() == [0,0])
		){
			handleSelect(ev)
		}
		_view.interaction = {
			status: "idle",
			start: new ext.Vector2(0,0),
			last: new ext.Vector2(0,0),
			button: 0
		}
		_editor.selectView(_view);
		_editor.refreshObjectPane();

	}).subscribe();

	$.fromEvent(dom, 'touchend').map((ev) => {
		var e = ev.originalEvent;
		if((_view.interaction.status === "mousedown" || _view.interaction.last.toArray() == [0,0])){
			var hitPos = new ext.Vector2(
				e.touches[0].clientX,
				e.touches[0].clientY
			);
			handleSelect(hitPos);
		}
		_view.interaction = {
			status: "idle",
			start: new ext.Vector2(0,0),
			last: new ext.Vector2(0,0)
		}
		_editor.selectView(_view);
		_editor.refreshObjectPane();
	}).subscribe();

	$.fromEvent(dom, 'wheel').map((ev) => {
		//console.log(event.originalEvent.deltaX, event.originalEvent.deltaY, event.originalEvent.deltaFactor);
		if(ev.deltaY < 0 && _view.zoom < 400){
			_view.zoom += 12.5;
		} else if (_view.zoom > 25) {
			_view.zoom -= 12.5;
		}

		_view.needRefreshingAll();

	}).subscribe();

};

View2D.prototype = Object.create( Element.prototype );
View2D.prototype.constructor = View2D;

View2D.prototype.drawObject = function(canvas, obj, _lineDash, _strokeStyle, _showCoords){

	var ctx = canvas.ctx;
	var _mod = this.mod;
	var scope = this;

	var _center = [];
	var _indexes = [];

	var scaleVector = new ext.Vector3().copy(obj.scale);
	var center2 = this.center.clone().add(scope.offset);

	var objPos3 = new ext.Vector3().copy(obj.position);

	var objCenter2 = objPos3.clone().toVector2(_mod).add(center2);


	var transformVectorTo2DCanvas = function(v3){
		return new ext.Vector3().copy(v3).multiply(scaleVector).applyEuler(obj.rotation).add(objPos3).toVector2(_mod).multiplyScalar(scope.zoom/100).add(center2)
	}

	if(obj.geometry.quads) {
		obj.geometry.quads.forEach(function(_quad, index){

			//var scaleVector2 = scaleVector.toVector2(_mod);
			// TODO: Impl a check whether a face should be displayed or not

			var quad2d = {
				a: new transformVectorTo2DCanvas(_quad.a),
				b: new transformVectorTo2DCanvas(_quad.b),
				c: new transformVectorTo2DCanvas(_quad.c),
				d: new transformVectorTo2DCanvas(_quad.d)
			};

			var path2d = [quad2d.a,quad2d.b,quad2d.c,quad2d.d,quad2d.a];

			canvas.path(path2d, false, _strokeStyle || '#777');

			/*ctx.beginPath();
			ctx.moveTo(quad2d.a.x,quad2d.a.y);
			ctx.lineTo(quad2d.b.x,quad2d.b.y);
			ctx.lineTo(quad2d.c.x,quad2d.c.y);
			ctx.lineTo(quad2d.d.x,quad2d.d.y);
			ctx.lineTo(quad2d.a.x,quad2d.a.y);
			ctx.closePath();*/

			scope.hitFaces.push({
				triangle: new THREE.Triangle(
					quad2d.a.toVector3(_mod),
					quad2d.b.toVector3(_mod),
					quad2d.c.toVector3(_mod)
				),
				position: obj.position.clone(),
				objId: obj.id
			});
			scope.hitFaces.push({
				triangle: new THREE.Triangle(
					quad2d.b.toVector3(_mod),
					quad2d.c.toVector3(_mod),
					quad2d.d.toVector3(_mod)
				),
				position: obj.position.clone(),
				objId: obj.id
			});

			var baseColor = new THREE.Color(0x555555);

			if(_showCoords){
				ctx.font="12px Arial";
				ctx.fillStyle="#999";

				if(scope.editor.indexes.length === 0 || scope.editor.indexes.indexOf(index+"")>-1){
					ctx.fillText("a("+(new ext.Vector3()).copy(_quad.a).toVector2(_mod).toArray().join(", ")+"), "+quad2d.a.toArray().join(", "),quad2d.a.x,quad2d.a.y);
					ctx.fillText("b("+(new ext.Vector3()).copy(_quad.b).toVector2(_mod).toArray().join(", ")+"), "+quad2d.b.toArray().join(", "),quad2d.b.x,quad2d.b.y);
					ctx.fillText("c("+(new ext.Vector3()).copy(_quad.c).toVector2(_mod).toArray().join(", ")+"), "+quad2d.c.toArray().join(", "),quad2d.c.x,quad2d.c.y);
					ctx.fillText("d("+(new ext.Vector3()).copy(_quad.d).toVector2(_mod).toArray().join(", ")+"), "+quad2d.d.toArray().join(", "),quad2d.d.x,quad2d.d.y);
				}
				_indexes.push(index);
				_center = objCenter2.clone();
			}
		});
	} else {
		obj.geometry.faces.forEach(function(face, index){

			var face2d = {
				a: transformVectorTo2DCanvas(obj.geometry.vertices[face.a]),
				b: transformVectorTo2DCanvas(obj.geometry.vertices[face.b]),
				c: transformVectorTo2DCanvas(obj.geometry.vertices[face.c])
			};

			var path2d = [face2d.a,face2d.b,face2d.c,face2d.a];

			canvas.path(path2d, false, _strokeStyle || '#777');

			var baseColor = new THREE.Color(0x555555);

			scope.hitFaces.push({
				triangle: new THREE.Triangle(
					face2d.a.toVector3(_mod),
					face2d.b.toVector3(_mod),
					face2d.c.toVector3(_mod)
				),
				position: obj.position.clone(),
				objId: obj.id
			});


		});
	}

	if(_showCoords){
		ctx.fillText(_indexes.join(", "),_center.x,_center.y);
	}


};

View2D.prototype.needRefreshing = function(){
	var args = Array.prototype.slice.call(arguments);
	args.forEach(function(arg){
		if(this.toBeRefreshed.indexOf(arg)==-1){
			this.toBeRefreshed.push(arg);
		}
	})
}

View2D.prototype.needRefreshingAll = function(){
	this.toBeRefreshed = ["grid", "scene", "selection", "indicators"];
}

View2D.prototype.init = function(){
	Element.prototype.init.call(this);
	this.needRefreshingAll();
}

View2D.prototype.refresh = function(scene){

	let dom = (typeof this.dom === 'string')
		? document.querySelector(this.dom)
		: this.dom;

	//
	for( var layer in this.layers){

		this.layers[layer].zoom = this.zoom;
		this.layers[layer].offset = this.offset;
		this.layers[layer].refresh();
		// TODO: impl need refreshing
		/*
		if(this.toBeRefreshed.indexOf(layer)>-1){
			this.layers[layer].refresh();
			this.toBeRefreshed.splice(this.toBeRefreshed.indexOf(layer),1);
			console.log(this.perspective + " view, "+layer+" layer refreshed");
		}
		*/
	}

	// draw indicators
	this.layers.indicators.text(this.perspective, new iblokz.gfx.Vector2(15,25),{font: "16px Arial", color: "#999"});
	this.layers.indicators.text(
		this.zoom,
		new iblokz.gfx.Vector2(this.layers.indicators.ctx.canvas.width - 65, 25),
		{font: "14px Arial", color: "#999"}
	);
	this.layers.indicators.text(
		this.offset.toArray().join(", "),
		new iblokz.gfx.Vector2(this.layers.indicators.ctx.canvas.width - 65, this.layers.indicators.ctx.canvas.height - 15),
		{font: "12px Arial", color: "#999"}
	);

	this.center.set(
		dom.clientWidth/2,
		dom.clientHeight/2
	);

	this.hitFaces = [];

	var that = this;

	scene.children.forEach(function(_obj){
		if(_obj.type === "Mesh"){
			switch(_obj.geometry.type){
				default:
					that.drawObject(that.layers.scene,_obj);
				break;
			}
		}
	});

	// draw the selected again
	if(scene.selected){
		var boxColor = "#DC3333";
		switch(this.editor.params["obj-mode"]){
			case "move":
				boxColor = "#DC3333";
				break;
			case "scale":
				boxColor = "#DCDC33";
				break;
			case "rotate":
				boxColor = "#33DC33";
				break;
		}
		this.drawObject(that.layers.selection, scene.selected,[0],boxColor,this.editor.params.debug);
		this.selected = {
			objId: scene.selected.id,
			position: scene.selected.position.clone()
		}
	} else {
		this.selected = false;
	}
};

export default View2D;
