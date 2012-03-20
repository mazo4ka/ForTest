//Поддержка leaflet
(function()
{
	var nextId = 0;							// следующий ID mapNode
	var leafLetMap = null;					// leafLet карта
	var leafLetLayers = {					// Хэш leafLet слоев - пока растровые тайловые слои
	};

	// Команды в leaflet
	var commands = {				// Тип команды
		'setBackgroundTiles': setBackgroundTiles			// добавить OSM слой
		,
		'addOSMTileLayer': addOSMTileLayer					// добавить OSM слой
		,
		'addScanExTileLayer': addScanExTileLayer			// добавить ScanEx тайловый слой
		,
		'addObject':	function(ph)	{					// добавить mapObject
			nextId++;
			return 'id' + nextId;
		}
		,
		'bringToTop': function(ph)	{					// установка z-index
			var id = ph.obj.objectId;
			//var myLayer = leafLetLayers[id];
			//return ph.obj.isVisible;
		}
		,
		'bringToBottom': function(ph)	{					// установка z-index
			var id = ph.obj.objectId;
			//var myLayer = leafLetLayers[id];
			//return ph.obj.isVisible;
		}
		,
		'bringToDepth': function(ph)	{					// установка z-index
			var id = ph.obj.objectId;
			var myLayer = leafLetLayers[id];
			if(myLayer) {
				myLayer.bringToDepth(ph.attr.zIndex);
			}
		}
		,
		'getVisibility': function(ph)	{					// получить видимость mapObject
			return ph.obj.isVisible;
		}
		,
		'setVisible':	function(ph)	{					// установить видимость mapObject
			var id = ph.obj.objectId;
			var myLayer = leafLetLayers[id];
			if(myLayer) {							// видимость слоя
				if(ph.attr) {
					if(!myLayer._isVisible) myLayer._isVisible = true, leafLetMap.addLayer(myLayer);
				}
				else
				{
					if(myLayer._isVisible) myLayer._isVisible = false, leafLetMap.removeLayer(myLayer);
				}
			}
		}
		,
		'getPosition': getMapPosition				// получить текущее положение map
		,
		'setMinMaxZoom':	function(ph)	{		// установка minZoom maxZoom карты
			leafLetMap.options.minZoom = ph.attr.z1;
			leafLetMap.options.maxZoom = ph.attr.z2;
		}
		,
		'getX':	function()	{ var pos = leafLetMap.getCenter(); return pos['lat']; }	// получить X карты
		,
		'getY':	function()	{ var pos = leafLetMap.getCenter(); return pos['lng']; }	// получить Y карты
		,
		'getZ':	function()	{ return leafLetMap.getZoom(); }	// получить Zoom карты
		,
		'zoomBy':	function(ph)	{				// установка Zoom карты
			var currZ = leafLetMap.getZoom() - ph.attr.dz;
			if(currZ > leafLetMap.getMaxZoom() || currZ < leafLetMap.getMinZoom()) return;
			var pos = leafLetMap.getCenter();
			if (ph.attr.useMouse && mousePos)
			{
				var k = Math.pow(2, leafLetMap.getZoom() - currZ);
				pos.lat = mousePos.lat + k*(pos.lat - mousePos.lat);
				pos.lng = mousePos.lng + k*(pos.lng - mousePos.lng);
			}
			leafLetMap.setView(pos, currZ);
//var pos = new L.LatLng(50.499276, 35.760498);
//leafLetMap.setView(pos, 8);
			
			//leafLetMap.setZoom(currZ);
		}
		,
		'moveTo':	function(ph)	{				//позиционирует карту по координатам центра и выбирает масштаб
			if(ph.attr['z'] > leafLetMap.getMaxZoom() || ph.attr['z'] < leafLetMap.getMinZoom()) return;
			var pos = new L.LatLng(ph.attr['y'], ph.attr['x']);
			leafLetMap.setView(pos, ph.attr['z']);
//var pos = new L.LatLng(50.499276, 35.760498);
//leafLetMap.setView(pos, 7);
		}
	}

	// Передача команды в leaflet
	function leafletCMD(cmd, hash)
	{
		var ret = {};
		var obj = hash['obj'] || null;	// Целевой обьект команды
		var attr = hash['attr'] || '';
if(!(cmd in commands)
	&& cmd != 'setCursorVisible'
	&& cmd != 'stopDragging'
	&& cmd != 'addContextMenuItem'
	&& cmd != 'setStyle'
	&& cmd != 'setGeometry'
	&& cmd != 'setHandler'
	&& cmd != 'setBackgroundColor'
	&& cmd != 'setZoomBounds'
	&& cmd != 'setVectorTiles'
	&& cmd != 'setFilter'
	&& cmd != 'setExtent'
	&& cmd != 'setClusters'
	&& cmd != 'setBackgroundTiles'
	) {
	// cmd"" cmd""
	var tt = 1;
}
		ret = (cmd in commands ? commands[cmd].call(commands, hash) : {});
		return ret;
	}

	function setBackgroundTiles(ph)	{	// добавить растровый слой
		var out = {};
		var layer = ph.attr;
		return out;
	}

	function getMapPosition() {
		var pos = leafLetMap.getCenter();
		return {
			'z': leafLetMap.getZoom()
			,'x': gmxAPI.merc_x(pos['lat'])
			,'y': gmxAPI.merc_y(pos['lng'])
		};
	}

	function prpLayerAttr(layer) {
		var out = {};
		if(layer) {
			if(layer.properties) {
				var prop = layer.properties;
				out['minZoom'] = (prop.MinZoom ? prop.MinZoom : 1);
				out['maxZoom'] = (prop.MaxZoom ? prop.MaxZoom : 20);
			}
			if(layer.geometry) {
				var geom = layer.geometry;
				if(geom) {
					var type = geom.type;
					out['type'] = type;
					var arr = null;
					if(geom.coordinates) {						// Формируем MULTIPOLYGON
						if(type == 'POLYGON') {
							arr = [geom.coordinates];
						} else if(type == 'MULTIPOLYGON') {
							arr = geom.coordinates;
						}
						if(arr) {
							var	bounds = new L.Bounds();
							var pointsArr = [];
							for (var i = 0; i < arr.length; i++)
							{
								for (var j = 0; j < arr[i].length; j++)
								{
									var pArr = [];
									var pol = arr[i][j];
									for (var j1 = 0; j1 < pol.length; j1++)
									{
										var p = new L.Point( pol[j1][0], pol[j1][1] );
										pArr.push(p);
										bounds.extend(p);
									}
									pointsArr.push(pArr);
								}
							}
							out['geom'] = pointsArr;						// Массив Point границ слоя
							out['bounds'] = bounds;							// Bounds слоя
						}
					}
				}
			}
		}
		return out;
	}

	function addScanExTileLayer(ph)	{	// добавить ScanEx тайловый слой
		var out = {};
		var layer = ph.attr.layer;


		var id = layer.objectId;
		var isRaster = (layer.properties.type == "Raster");
		if(isRaster) {
			var url = ph.attr.prefix + "&z={z}&x={x}&y={y}";
			var attr = prpLayerAttr(layer);
//if(layer.properties.title != "Spot5_Volgograd") return out;
//if(layer.properties.title != "карта Украины") return out;

			var option = {'url': url, 'minZoom': attr['minZoom'], 'maxZoom': attr['maxZoom'], 'attr': attr, 'layer': layer, 'index':ph.attr.zIndex};
			//var option = {'url': url, 'unloadInvisibleTiles': true, 'minZoom': attr['minZoom'], 'maxZoom': attr['maxZoom'], 'attr': attr, 'layer': layer, 'index':ph.attr.zIndex};
			var geom = attr['geom'];
			var myLayer = null;
			if(geom) {
				myLayer = new L.TileLayer.ScanExCanvas(option);
				//myLayer._pointsArr = geom;
			}
			else
			{
				myLayer = new L.TileLayer.ScanEx(url, option);
			}
			//myLayer._url = url;
			leafLetLayers[layer.objectId] = myLayer;
			myLayer.bringToDepth(ph.attr.zIndex);
			myLayer.setDOMid(layer.objectId);
			myLayer._isVisible = (layer.isVisible ? true : false);
			if(myLayer._isVisible) 
				leafLetMap.addLayer(myLayer);
		}
		return out;
	}

	function addOSMTileLayer(ph)	{	// добавить OSM тайловый слой
		var out = {};
		var layer = ph.attr.layer;
		var id = layer.objectId;
		var url = ph.attr.urlOSM;
		var subdomains = ph.attr.subdomains;
		var myLayer = new L.TileLayer(url, {subdomains: subdomains});
		leafLetLayers[layer.objectId] = myLayer;
		leafLetMap.addLayer(myLayer);
		myLayer._isVisible = true;
		return out;
	}
	
	var leafLetCont_ = null;
	var mapDivID = '';
	var initFunc = null;
	var intervalID = 0;
	var mousePos = null;
	// 
	function waitMe(e)
	{
		if('L' in window) {
			clearInterval(intervalID);
			leafLetMap = new L.Map(leafLetCont_,
				{
					zoomControl: false,	
					//zoomAnimation: false,	
					//fadeAnimation: false,	
					crs: L.CRS.EPSG3395
					//'crs': L.CRS.EPSG3857 // L.CRS.EPSG4326 // L.CRS.EPSG3395 L.CRS.EPSG3857
				}
			);

			//var pos = new L.LatLng(55, 80);
			var pos = new L.LatLng(50.499276, 35.760498);
			leafLetMap.setView(pos, 3);
			leafLetMap.on('moveend', function(e) {	gmxAPI._updatePosition(e); });
			leafLetMap.on('mousemove', function(e) { mousePos = e.latlng; });

			var getTileUrl = function(obj, tilePoint, zoom) {
				var res = '';
				var urlParams = (obj._urlParams ? obj._urlParams : {});
				
				if(zoom < obj.options.minZoom || zoom > obj.options.maxZoom) return res;
				res = L.Util.template(obj.options.url, L.Util.extend({
					z: zoom + obj.options.zoomOffset,
					x: tilePoint.x - Math.round(Math.pow(2, zoom - 1)),
					y: -tilePoint.y - 1 + Math.round(Math.pow(2, zoom - 1))
				}, urlParams));
				return res;
			};
			var bringToDepth = function(obj, zIndex) {
				if(obj._container) {
				   obj.options.zIndex = zIndex;
				   if(obj._container.style.zIndex != zIndex) obj._container.style.zIndex = zIndex;
				   if(obj._container.style.position != 'relative') obj._container.style.position = 'relative';
				}
			};
			var setGMXid = function(obj, id) {
				if(obj._container) {
				   if(obj._container.id != id) obj._container.id = id;
				}
			};
			var chkNode = function(obj) {
				setGMXid(obj, obj.options.layer.objectId);
				bringToDepth(obj, obj.options.index);
			};

			var ScanEx = {
				bringToBottom: function(zIndex) {
					var tt = this;
				}
				,
				bringToTop: function(zIndex) {
					var tt = this;
				}
				,
				bringToDepth: function(zIndex) { bringToDepth(this, zIndex); }
				,
				setDOMid: function(id) { setGMXid(this, id); }
				,
				getTileUrl: function(tilePoint, zoom) {
					return getTileUrl(this, tilePoint, zoom);
				}
				,
				drawTile : function(tile, tilePoint, zoom) {
					var tileX = 256*tilePoint.x;
					var tileY = 256*tilePoint.y;
				}
			};
			L.TileLayer.ScanEx = L.TileLayer.extend(ScanEx);

			L.TileLayer.ScanExCanvas = L.TileLayer.Canvas.extend(
			{
				_initContainer: function () {
					var tilePane = this._map.getPanes().tilePane,
						first = tilePane.firstChild;

					if (!this._container || tilePane.empty) {
						this._container = L.DomUtil.create('div', 'leaflet-layer');

						if (this._insertAtTheBottom && first) {
							tilePane.insertBefore(this._container, first);
						} else {
							tilePane.appendChild(this._container);
						}

						//this._setOpacity(this.options.opacity);
						chkNode(this);
					}
				},
				bringToBottom: function(zIndex) {
					var tt = this;
				}
				,
				bringToTop: function(zIndex) {
					var tt = this;
				}
				,
				bringToDepth: function(zIndex) { bringToDepth(this, zIndex); }
				,
				setDOMid: function(id) { setGMXid(this, id); }
				,
				drawTile: function (tile, tilePoint, zoom) {
					// override with rendering code
					if(!this._isVisible) return;								// Слой невидим
					var st = zoom + '_' + tilePoint.x + '_' + tilePoint.y;
					//if(tile._layer.__badTiles[st]) return;	// пропускаем отсутствующие тайлы

					var tileX = 256 * tilePoint.x;								// позиция тайла в stage
					var tileY = 256 * tilePoint.y;

					var p1 = new L.Point(tileX, tileY);
					var pp1 = leafLetMap.unproject(p1, zoom);					// Перевод экранных координат тайла в latlng
					p1.x = pp1.lng; p1.y = pp1.lat;
					var	p2 = new L.Point(tileX + 256, tileY + 256);
					var pp2 = leafLetMap.unproject(p2, zoom);
					p2.x = pp2.lng; p2.y = pp2.lat;
					var bounds = new L.Bounds(p1, p2);

					var attr = this.options.attr;
					if(!bounds.intersects(attr.bounds))	{						// Тайл не пересекает границы слоя
						return;
					}
					var ctx = tile.getContext('2d');
					var imageObj = new Image();
					imageObj.onerror = function() {			// пометить отсутствующий тайл
						//tile._layer.__badTiles[st] = true;
					}
					
					imageObj.onload = function(){
						ctx.beginPath();
						ctx.rect(0, 0, tile.width, tile.height);
						ctx.clip();

						var geom = attr['geom'];
						for (var i = 0; i < geom.length; i++)
						{
							var pt = geom[i];
							//ctx.strokeStyle = "#000";
							//ctx.lineWidth = 2;
							ctx.beginPath();
							var pArr = L.PolyUtil.clipPolygon(pt, bounds);
							for (var j = 0; j < pArr.length; j++)
							{
								var p = new L.LatLng(pArr[j].y, pArr[j].x);
								var pp = leafLetMap.project(p, zoom);
								var px = pp.x - tileX;
								var py = pp.y - tileY;
								if(j == 0) ctx.moveTo(px, py);
								ctx.lineTo(px, py);
							}
							pArr = null;
							//ctx.stroke();
							//ctx.closePath();
						}
						
						var pattern = ctx.createPattern(imageObj, "no-repeat");
						ctx.fillStyle = pattern;
						ctx.fill();
					};
					var src = getTileUrl(tile._layer, tilePoint, zoom);
					imageObj.src = src;
				}
			}
			);
			
			initFunc(mapDivID, 'leaflet');
		}
	}

	// Добавить leaflet.js в DOM
	function addLeafLetObject(apiBase, flashId, ww, hh, v, bg, loadCallback, FlagFlashLSO)
	{
		mapDivID = flashId;
		initFunc = loadCallback;

		var script = document.createElement("script");
		script.setAttribute("charset", "windows-1251");
		script.setAttribute("src", "leaflet/leaflet.js");
		document.getElementsByTagName("head").item(0).appendChild(script);
		//script.setAttribute("onLoad", onload );
		
		var css = document.createElement("link");
		css.setAttribute("type", "text/css");
		css.setAttribute("rel", "stylesheet");
		css.setAttribute("media", "screen");
		css.setAttribute("href", "leaflet/leaflet.css");
		document.getElementsByTagName("head").item(0).appendChild(css);

		leafLetCont_ = gmxAPI.newElement(
			"div",
			{
				id: mapDivID
			},
			{
				width: "100%",
				height: "100%",
				zIndex: 0,
				border: 0
			}
		);
		intervalID = setInterval(waitMe, 50);

		return leafLetCont_;
	}
	
	//расширяем namespace
    gmxAPI._cmdProxy = leafletCMD;				// посылка команд отрисовщику
    gmxAPI._addProxyObject = addLeafLetObject;	// Добавить в DOM
    
})();