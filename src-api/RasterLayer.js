// растровый слой
(function()
{
    "use strict";
	var LMap = null;						// leafLet карта
	var utils = null;						// утилиты для leaflet
	var mapNodes = null;					// Хэш нод обьектов карты - аналог MapNodes.hx

	// Добавить растровый слой
	function setBackgroundTiles(ph)	{
		if(!LMap) init();
		var out = {};
		var layer = ph.obj;
		var id = layer.objectId;
		var node = mapNodes[id];
		if(!node) return;						// Нода не определена
		var gmxNode = null;						// Нода gmxAPI
		node['type'] = 'RasterLayer';
		node['isOverlay'] = false;
		node['failedTiles'] = {};				// Hash тайлов 404
		node['zIndexOffset'] = 0;				// Сдвиг zIndex
		node['listenerIDS'] = {};				// id прослушивателей событий
		node['leaflet'] = null;					// Нода leaflet
		var myLayer = null;

		var inpAttr = ph.attr;
		node['subType'] = ('subType' in inpAttr ? inpAttr['subType'] : (inpAttr['projectionCode'] === 1 ? 'OSM' : ''));
		var attr = {};

		attr['mercGeom'] = layer.mercGeometry || {				// граница слоя в merc
			'type': "POLYGON"
			,'coordinates': [[
				[-20037500, -21133310]
				,[-20037500, 21133310]
				,[20037500, 21133310]
				,[20037500, -21133310]
				,[-20037500, -21133310]
			]]
		};
		
		if(node.propHiden) {
			if(node.propHiden.geom) {
				attr['geom'] = node.propHiden['geom'];					// Геометрия от обьекта векторного слоя
				attr['bounds'] = attr['geom']['bounds'];				// Bounds слоя
			}
			if(node.propHiden.zIndexOffset) node['zIndexOffset'] = node.propHiden['zIndexOffset'];
		}
		var pNode = mapNodes[node.parentId];					// Нода родителя
		if(pNode && pNode.propHiden && pNode.propHiden.subType === 'tilesParent') {
			attr['minZoom'] = pNode.minZ || 1;
			attr['maxZoom'] = pNode.maxZ || 30;
										// pNode.parentId нода векторного слоя по обьекту которого создан растровый слой 
		} else {
			if(pNode && pNode.zIndexOffset) {
				node['zIndexOffset'] = pNode.zIndexOffset;
			}
		}
		if(!'zIndex' in node) node['zIndex'] = utils.getIndexLayer(id);
		node['zIndex'] += node['zIndexOffset'];

		node.getLayerBounds = function(flag) {				// Проверка границ растрового слоя
			if(!gmxNode || !attr.mercGeom) return;
			var ext = null;
			if('getLayerBounds' in gmxNode && !flag) ext = gmxNode.getLayerBounds();
			else {
				var geo = gmxNode.getGeometry();
				if(!geo || !geo.type) {
					geo = attr.mercGeom;
					var boundsMerc = gmxAPI.getBounds(geo.coordinates);
					ext = {
						minX: gmxAPI.from_merc_x(boundsMerc.minX),
						minY: gmxAPI.from_merc_y(boundsMerc.minY),
						maxX: gmxAPI.from_merc_x(boundsMerc.maxX),
						maxY: gmxAPI.from_merc_y(boundsMerc.maxY)
					};
				} else {
					ext = gmxAPI.getBounds(geo.coordinates);
					attr.mercGeom = gmxAPI.merc_geometry(geo);
				}
			}
			
			var	bounds = new L.Bounds();
			bounds.extend(new L.Point(ext.minX, ext.minY));
			bounds.extend(new L.Point(ext.maxX, ext.maxY));
			attr.bounds = bounds;
            node.boundsMerc = {         // extent с учетом сдвига в Меркаторе растрового слоя
                minX: gmxAPI.merc_x(ext.minX),
                maxX: gmxAPI.merc_x(ext.maxX),
                minY: gmxAPI.merc_y(ext.minY),
                maxY: gmxAPI.merc_y(ext.maxY)
            };
            node.boundsMercWithShift = {         // extent с учетом сдвига в Меркаторе растрового слоя
                minX: node.boundsMerc.minX + (node.shiftX || 0),
                maxX: node.boundsMerc.maxX + (node.shiftX || 0),
                minY: node.boundsMerc.minY + (node.shiftY || 0),
                maxY: node.boundsMerc.maxY + (node.shiftY || 0)
            };
//console.log('boundsMerc', node.shiftX, node.boundsMerc);
		}

		var chkVisible = function() {
        //gmxAPI._leaflet.zoomstart
			if(gmxNode && node.isVisible != false) {
				var notOnScene = true;
				var continuousWorld = false;
				if(myLayer) {
					if(myLayer._map) notOnScene = false;
					continuousWorld = myLayer.options.continuousWorld;
				}
				if(!continuousWorld && !node.boundsMercWithShift) {
					node.getLayerBounds();
				}
                var ext = (gmxAPI.currPosition && gmxAPI.currPosition.extent ? gmxAPI.currPosition.extent : gmxAPI.map.getPosition().extent);
				var notViewFlag = (!utils.chkVisibilityByZoom(id)
					|| (!continuousWorld && !gmxAPI.extIntersect(node.boundsMercWithShift, ext))
					);
//console.log('chkVisible', notViewFlag1 , notViewFlag, gmxAPI._leaflet.zoomstart, node.boundsMerc, currPos.extent);
				if(notOnScene != notViewFlag) {
					utils.setVisibleNode({obj: node, attr: !notViewFlag});
					if(notViewFlag)	delete gmxAPI._leaflet.renderingObjects[node.id];
				}
			}
		}

		node['remove'] = function() {				// Удалить растровый слой
			if(myLayer) LMap.removeLayer(myLayer);
		}

		node['setStyle'] = function() {
			var newOpacity = node.regularStyle.fillOpacity;
			if(newOpacity != myLayer.options.opacity) {			// Изменить opacity растрового слоя
				myLayer.options.opacity = newOpacity;
				myLayer.setOpacity(newOpacity);
			}
		}
		node.onZoomend = function()	{				// Проверка видимости по Zoom
			chkVisible();
		}

		var redrawTimer = null;										// Таймер
		var waitRedraw = function()	{								// Требуется перерисовка с задержкой
			if(redrawTimer) clearTimeout(redrawTimer);
			redrawTimer = setTimeout(function()
			{
				chkVisible();
				if(!node.isVisible || !node['leaflet'] || !node['leaflet']._map) return;
				redrawTimer = null;
				myLayer._update();
				//node['leaflet'].redraw();
			}, 10);
			return false;
		}
		node['waitRedraw'] = waitRedraw;
		node.isVisible = true;
		if(layer.properties) {
            if('visible' in layer.properties) node.isVisible = layer.properties.visible;
            if('MetaProperties' in layer.properties) {
                var meta = layer.properties.MetaProperties;
                if('shiftX' in meta || 'shiftY' in meta) {
                    node.shiftX = meta.shiftX ? Number(meta.shiftX.Value) : 0;
                    node.shiftY = meta.shiftY ? Number(meta.shiftY.Value) : 0;
                }
            }
        }
        node.dragAttr = null;
        var mousemove = function(e) {
			var latlng = e.latlng;
            if(node.dragAttr && node.dragAttr.drag) node.dragAttr.drag(latlng.lng, latlng.lat, gmxNode);
        }
        var mouseup = function(e) {
			var latlng = e.latlng;
            LMap.off('mousemove', mousemove);
            LMap.off('mouseup', mouseup);
            LMap.off('mouseout', mouseout);
            if(node.dragAttr && node.dragAttr.dragend) node.dragAttr.dragend(latlng.lng, latlng.lat, gmxNode);
            gmxAPI._leaflet.utils.unfreeze();
            gmxAPI.map.dragState = false;
        }
        var mouseout = function(e) {
            mouseup(e);
        }
        var dragOn = function(pt) {
			var latlng = gmxAPI._leaflet.mousePos;
            if('isPointIn' in node && !node.isPointIn(latlng)) {
                gmxAPI._leaflet.utils.unfreeze();
                gmxAPI.map.dragState = false;
                return false;
            }
            if(!gmxAPI.map.dragState) {
                gmxAPI._leaflet.utils.freeze();
                gmxAPI.map.dragState = true;
                if(myLayer._clearBgBufferTimer) clearTimeout(myLayer._clearBgBufferTimer);
				setTimeout(L.bind(myLayer._clearBgBuffer, myLayer), 500);
            }
            
            LMap.on('mousemove', mousemove);
            LMap.on('mouseup', mouseup);
            LMap.on('mouseout', mouseout);
            if(node.dragAttr && node.dragAttr.dragstart) node.dragAttr.dragstart(latlng.lng, latlng.lat, gmxNode);
        }
        gmxAPI.extend(node, {
            eventsCheck: function(evName, attr) {			// проверка событий растрового слоя
                var onScene = (myLayer && myLayer._map ? true : false);
                if(gmxAPI._drawing.activeState
                    || !onScene
                    || gmxAPI._leaflet.curDragState
                    || !node.isPointIn(attr.latlng)
                    ) return false;

                if(evName in node.handlers) {		// Есть handlers на слое
                    var res = node.handlers[evName].call(gmxNode, node.id, gmxNode.properties, attr);
                    if(res) return true;
                }
                if(evName === 'onMouseDown' && node.dragAttr) {		// Есть enableDragging на слое
                    dragOn(attr);
                    return true;
                }
                return false;
            }
            ,
            enableDragging: function(pt) {     // Включить drag
                if(node.dragAttr) node.disableDragging();
                node.dragAttr = pt.attr;
                //LMap.on('mousedown', dragOn);
            }
            ,disableDragging: function() {
                //LMap.off('mousedown', dragOn);
                gmxAPI._leaflet.utils.unfreeze();
                gmxAPI.map.dragState = false;
                node.dragAttr = null;
            }
            ,setPositionOffset: function(pt) {	// Установить смещение слоя в метрах Меркатора
                node.shiftX = pt.shiftX || 0;
                node.shiftY = pt.shiftY || 0;
                if(myLayer) {
                    node.getLayerBounds();
                    myLayer.options.shiftX = node.shiftX;
                    myLayer.options.shiftY = node.shiftY;
                    myLayer.updateTilesPosition();
                    myLayer._update();
                }
			}
            ,getPositionOffset: function() {	// Получить смещение слоя в метрах Меркатора
                return {shiftX: node.shiftX, shiftY: node.shiftY};
			}
            ,isPointIn: function(latlng) {		// true - latlng точка внутри растрового слоя
                if(!node.isVisible 
                    || !myLayer
                    || !gmxNode
                    ) return false;
                var point = [gmxAPI.merc_x(latlng.lng), gmxAPI.merc_y(latlng.lat)];
                var boundsMercWithShift = node.boundsMercWithShift;
                if(boundsMercWithShift) {
                    if(point[0] < boundsMercWithShift.minX || point[0] > boundsMercWithShift.maxX
                        || point[1] < boundsMercWithShift.minY || point[1] > boundsMercWithShift.maxY
                    ) return false;
                }
                // TODO: учет сдвига shiftX shiftY
                var shiftX = node.shiftX || 0;
                var shiftY = node.shiftY || 0;
                var options = myLayer.options;
                var mercGeom = options.attr.mercGeom;
                if(mercGeom && mercGeom.coordinates && mercGeom.coordinates[0]) {
                    point[0] -= shiftX, point[1] -= shiftY;
                    var coords = mercGeom.coordinates;
                    if(mercGeom.type === 'POLYGON') coords = [coords];
                    for (var i = 0, len = coords.length; i < len; i++) {
                        if(utils.isPointInPolygonArr(point, coords[i][0])) return true;
                    }
                    return false;
                }
                return true;
            }
            ,setGeometry: function() {			// Установка геометрии
                attr.mercGeom = gmxAPI.merc_geometry(node.geometry);
                if(myLayer) {
                    node.getLayerBounds(true);
                    myLayer.options.attr = attr;
                    myLayer.redraw();
                }
            }
		});

		var chkInitListeners = function()	{								// Требуется перерисовка с задержкой
			var func = function(flag) {	// Изменилась видимость слоя
				if(flag) {
					if('nodeInit' in node) node['nodeInit']();
					chkVisible();
				}
			};
			var key = 'onChangeVisible';
			if(!node['listenerIDS'][key]) {
				node['listenerIDS'][key] = {'obj': gmxNode, 'evID': gmxNode.addListener(key, func, -10)};
			}
			if(node.isVisible) {
				func(node.isVisible);
			}
		}
		node['nodeInit'] =	function() {
			delete node['nodeInit'];

			var initCallback = function(obj) {			// инициализация leaflet слоя
				if(obj._container) {
					if(obj._container.id != id) obj._container.id = id;
					//if(obj._container.style.position != 'absolute') obj._container.style.position = 'absolute';
					
					if(!'zIndex' in node) node.zIndex = utils.getIndexLayer(id) + node.zIndexOffset;
					utils.bringToDepth(node, node.zIndex);
					if('shiftOSM' in node) node.shiftOSM();
					if(!attr.bounds || attr.bounds.max.x > 180 || (attr.bounds.min.x < -179 && attr.bounds.min.y < -84 && attr.bounds.max.x > 179 && attr.bounds.max.y > 84)) {
						delete obj.options.bounds;
						obj.options.continuousWorld = true;
					}
					else {
						obj.options.bounds = new L.LatLngBounds([new L.LatLng(attr['bounds'].min.y, attr['bounds'].min.x), new L.LatLng(attr['bounds'].max.y, attr['bounds'].max.x)]);
					}
				}
			};
			var createLayer = function() {			// инициализация leaflet слоя
				if(!gmxNode) {
					gmxNode = gmxAPI.mapNodes[id];
					chkInitListeners();
				}
				var option = {
					'minZoom': inpAttr['minZoomView'] || 1
					,'maxZoom': inpAttr['maxZoomView'] || 30
					,'minZ': inpAttr['minZoom'] || attr['minZoom'] || gmxAPI.defaultMinZoom
					,'maxZ': inpAttr['maxZoom'] || attr['maxZoom'] || gmxAPI.defaultMaxZoom
					,'zIndex': node['zIndex']
					,shiftX: node.shiftX || 0
					,shiftY: node.shiftY || 0
					,'initCallback': initCallback
					,'tileFunc': inpAttr['func']
					,'attr': attr
					,'_needLoadTile': 0
                    ,_inLoadImage: {}
					,'nodeID': id
					,'badTiles': {}
					,'async': true
					,'unloadInvisibleTiles': true
					//,'countInvisibleTiles': (L.Browser.mobile ? 0 : 2)
				};
				if(gmxNode.properties.type === 'Overlay') {
					node.isOverlay = true;
					if(!node.zIndexOffset) node.zIndexOffset = 50000;
				} else {
					if(gmxNode.isBaseLayer) node.zIndexOffset = -100000;
				}
                node.getLayerBounds();

				if(!gmxNode.isBaseLayer && attr['bounds']) {
					option['bounds'] = new L.LatLngBounds([new L.LatLng(attr['bounds'].min.y, attr['bounds'].min.x), new L.LatLng(attr['bounds'].max.y, attr['bounds'].max.x)]);
				} else {
					option['continuousWorld'] = true;
				}

				if(node['subType'] === 'OSM') {
					node['shiftOSM'] = function() {
						myLayer.options.shiftOSM = utils.getOSMShift();
					}
					myLayer = new L.TileLayer.OSMcanvas(option);
				} else {
					myLayer = new L.TileLayer.ScanExCanvas(option);
				}
				node['leaflet'] = myLayer;
				var chkPosition = function() {
					chkVisible();
				}
				LMap.on('move', chkPosition);
				LMap.on('zoomend', chkPosition);
				chkVisible();
			}

			var createLayerTimer = null;										// Таймер
			var waitCreateLayer = function()	{								// Требуется перерисовка слоя с задержкой
				if(createLayerTimer) clearTimeout(createLayerTimer);
				createLayerTimer = setTimeout(function()
				{
					createLayerTimer = null;
					if(gmxAPI.map.needMove) {
						waitCreateLayer();
						return;
					}
					createLayer();
				}, 200);
			}
			if(gmxAPI.map.needMove) {
				waitCreateLayer();
			} else {
				createLayer();
			}
		}

		gmxNode = gmxAPI.mapNodes[id];		// Нода gmxAPI
		var onLayerEventID = gmxNode.addListener('onLayer', function(obj) {	// Слой инициализирован
			gmxNode.removeListener('onLayer', onLayerEventID);
			gmxNode = obj;
			chkInitListeners();
		});
		if(node.isVisible && gmxNode && gmxNode.isVisible) chkInitListeners();
		
		return out;
	}
	// инициализация
	function init(arr)	{
		LMap = gmxAPI._leaflet['LMap'];
		utils = gmxAPI._leaflet['utils'];
		mapNodes = gmxAPI._leaflet['mapNodes'];

		function drawCanvasPolygon( ctx, x, y, lgeo, opt) {
			if(!lgeo) return;
			var zoomCurrent = gmxAPI._leaflet.zoomCurrent;
			var tileSize = zoomCurrent.tileSize;
			//var mInPixel = zoomCurrent.mInPixel;
            var node = mapNodes[opt.nodeID];
			//var shiftX = opt.shiftX || 0;
			//var shiftY = opt.shiftY || 0;
			var shiftOSM = (opt.shiftOSM ? opt.shiftOSM : 0);
			if(node.boundsMerc) {
				var extMerc = node.boundsMerc;
				var minx = x * tileSize;
				var maxx = minx + tileSize;
				if (maxx < extMerc.minX) x += zoomCurrent.pz;
				else if (minx > extMerc.maxX) x -= zoomCurrent.pz;
			}
            //ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
			ctx.beginPath();
			var drawPolygon = function(arr) {
				for (var j = 0; j < arr.length; j++)
				{
					var xx = arr[j][0] / tileSize - x;
					var yy = arr[j][1] / tileSize - y;
					var px = 256 * xx;				    px = (0.5 + px) << 0;
					var py = 256 * (1 - yy) - shiftOSM;	py = (0.5 + py) << 0;
					if(j == 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
			}
			for(var i=0; i<lgeo.coordinates.length; i++) {
				var tarr = lgeo.coordinates[i];
				if(lgeo.type === 'MULTIPOLYGON') {
					for (var j = 0, len1 = lgeo.coordinates[i].length; j < len1; j++) {
						drawPolygon(lgeo.coordinates[i][j]);
					}
				} else {
					drawPolygon(lgeo.coordinates[i]);
				}
			}
			ctx.closePath();
			//ctx.stroke();
		}

		// Растровый слой с маской
		L.TileLayer.ScanExCanvas = L.TileLayer.Canvas.extend(
		{
			_initContainer: function () {
				L.TileLayer.Canvas.prototype._initContainer.call(this);
				//if('initCallback' in this.options) this.options.initCallback(this);
                this.updateTilesPosition();
			}
			,
			_reset: function (e) {
                for(var key in this.options._inLoadImage) {
                    gmxAPI._leaflet.imageLoader.removeItemsBySrc(key);
                }
                this.options._inLoadImage = {};
                L.TileLayer.Canvas.prototype._reset.call(this, e);
                this.options._needLoadTile = 0;
                
			}
			,
			_addTile: function (tilePoint, container) {
				this.drawTile(null, tilePoint, this._map._zoom);
			}
			,
            '_update': function() {
                var opt = this.options,
                    nodeID = opt.nodeID,
                    _map = this._map,
                    node = mapNodes[nodeID];
                if (!_map || gmxAPI._leaflet.zoomstart) {
                    node.waitRedraw();
                    return;
                }

                var zoom = _map.getZoom();
                if (zoom > opt.maxZoom || zoom < opt.minZoom) {
                    delete gmxAPI._leaflet.renderingObjects[nodeID];
                    return;
                }
                gmxAPI._leaflet.renderingObjects[nodeID] = 1;
                if('initCallback' in opt) opt.initCallback(this);
                var sbounds   = _map.getPixelBounds(),
                    tileSize = opt.tileSize;

                if(!gmxAPI._leaflet.zoomCurrent) utils.chkZoomCurrent();
                var zoomCurrent = gmxAPI._leaflet.zoomCurrent;
                var mInPixel = zoomCurrent.mInPixel;
                var shiftX = mInPixel * (opt.shiftX || 0);
                var shiftY = mInPixel * (opt.shiftY || 0);
                var shiftOSM = (opt.shiftOSM ? opt.shiftOSM : 0);		// Сдвиг для OSM
                shiftY -= shiftOSM;
                sbounds.min.y += shiftY, sbounds.max.y += shiftY;
                sbounds.min.x -= shiftX, sbounds.max.x -= shiftX;

                var nwTilePoint = new L.Point(
                        Math.floor(sbounds.min.x / tileSize),
                        Math.floor(sbounds.min.y / tileSize)),
                    seTilePoint = new L.Point(
                        Math.floor(sbounds.max.x / tileSize),
                        Math.floor(sbounds.max.y / tileSize)),
                    tileBounds = new L.Bounds(nwTilePoint, seTilePoint);

				var pz = Math.pow(2, zoom) - 1;
                if(tileBounds.min.y < 0) tileBounds.min.y = 0;
                if(tileBounds.max.y > pz) tileBounds.max.y = pz;

                this._addTilesFromCenterOut(tileBounds);

                if (opt.unloadInvisibleTiles || opt.reuseTiles) {
                    this._removeOtherTiles(tileBounds);
                }
                if(opt._needLoadTile < 1) delete gmxAPI._leaflet.renderingObjects[nodeID];
            }
			,
			_getLoadedTilesPercentage: function (container) {
				// Added by OriginalSin
				if(!container) return 0;
				var len = 0, count = 0;
				var arr = ['img', 'canvas'];
				for (var key in arr) {
					var tiles = container.getElementsByTagName(arr[key]);
					if(tiles && tiles.length > 0) {
						len += tiles.length;
						for (var i = 0; i < tiles.length; i++) {
							if (tiles[i]._tileComplete) {
								count++;
							}
						}
					}
				}
				if(len < 1) return 0;
				return count / len;	
			}
			,
			_getGMXtileNum: function (tilePoint, zoom) {
				var pz = Math.pow(2, zoom);
				var tx = tilePoint.x % pz + (tilePoint.x < 0 ? pz : 0);
				var ty = tilePoint.y % pz + (tilePoint.y < 0 ? pz : 0);
				var gmxTilePoint = {
					x: tx % pz - pz/2
					,y: pz/2 - 1 - ty % pz
				};
				gmxTilePoint.gmxTileID = zoom + '_' + gmxTilePoint.x + '_' + gmxTilePoint.y
				return gmxTilePoint;
			}
			,
			drawTile: function (tile, tilePoint, zoom) {
				// override with rendering code
                var layer = this,
                    tileKey = tilePoint.x + ':' + tilePoint.y,
                    opt = layer.options,
                    node = mapNodes[opt.nodeID];
				if(!node) return;								// Слой пропал
                
                if(!zoom) zoom = LMap.getZoom();
                if(!gmxAPI._leaflet.zoomCurrent) utils.chkZoomCurrent(zoom);
                var gmxTilePoint = layer._getGMXtileNum(tilePoint, zoom);

				var attr = opt.attr;
				var allFlag = (!attr.bounds || (attr.bounds.min.x < -179 && attr.bounds.min.y <= -85 && attr.bounds.max.x > 179 && attr.bounds.max.y >= 85));
                var isIntersects = 0;
                if(allFlag) isIntersects = 2;
                else {
                    var tileExtent = gmxAPI.getTileExtent(gmxTilePoint.x, gmxTilePoint.y, zoom);
                    if(gmxAPI.extIntersect(tileExtent, node.boundsMerc)) isIntersects++;
                    if(!isIntersects) {
                        tileExtent.minX += gmxAPI.worldWidthMerc2, tileExtent.maxX += gmxAPI.worldWidthMerc2;
                        if(gmxAPI.extIntersect(tileExtent, node.boundsMerc)) isIntersects++;
                    }
                    // todo: реальное пересечение screenTile с геометрией слоя
                    //if(isIntersects) isIntersects += gmxAPI._leaflet['utils'].chkExtInPolygonArr(tileExtent, attr['mercGeom']['coordinates'][0]);
                }
                if(isIntersects === 0) return;

                var loadRasterRecursion = function(pt) {
                    if(!('to' in pt.zoom)) pt.zoom.to = pt.zoom.from;
                    var z = pt.zoom.to;
                    if(z > opt.maxZ) {
                        var dz = Math.pow(2, z - opt.maxZ);
                        pt.x = Math.floor(pt.x/dz), pt.y = Math.floor(pt.y/dz);
                        z = pt.zoom.to = opt.maxZ;
                    }
                    var rUrl = opt.tileFunc(pt.x, pt.y, z);
                    var gmxTileKey = z + '_' + pt.x + '_' + pt.y;

                    var onError = function() {
                        //console.log('onError', z, opt.maxZ, rUrl); // 
                        if (z > 1) {
                            //if(pt.zoom.from === z) 
                            opt.badTiles[gmxTileKey] = true;
                            // запрос по раззумливанию растрового тайла
                            pt.zoom.to = z - 1, pt.x = Math.floor(pt.x/2), pt.y = Math.floor(pt.y/2);
                            loadRasterRecursion(pt);
                        } else {
                            pt.callback(null);
                            return;
                        }
                    };
                    if(opt.badTiles[gmxTileKey]) {
                        onError();
                        return;
                    }

                    var item = {
                        'src': rUrl
                        ,'zoom': z
                        ,'callback': function(imageObj) {
                            delete opt._inLoadImage[rUrl];
                            pt.callback({'img': imageObj, 'zoom': z, 'fromZoom': pt.zoom.from});
                        }
                        ,'onerror': function() {
                            delete opt._inLoadImage[rUrl];
                            onError();
                        }
                    };
					if(pt.zoom.from != z) item.crossOrigin = 'use-credentials';
                    opt._inLoadImage[rUrl] = true;
                    gmxAPI._leaflet.imageLoader.push(item);
                }
                opt._needLoadTile++;
                loadRasterRecursion({
                    callback: function(ph) {
                        opt._needLoadTile--;
                        if(!layer._map || gmxAPI._leaflet.zoomstart) {
                            //node.waitRedraw();
                            return;     // идет анимация
                        }
                        if(LMap.getZoom() != zoom) {
                            return;     // Только для текущего zoom
                        }
                        if(ph) {     // Есть раззумленный тайл
                            var imageObj = ph.img;
                            if(imageObj && imageObj.width === 256 && imageObj.height === 256) {
                                var pos = null;
                                if(ph.zoom !== zoom) {
                                    pos = gmxAPI.getTilePosZoomDelta(gmxTilePoint, zoom, ph.zoom);
                                    if(pos.size < 0.00390625
                                        || pos.x > 255 || pos.y > 255
                                        || (pos.x + pos.size) < 0
                                        || (pos.y + pos.size) < 0
                                    ) {
                                        return;
                                    }
                                }
                                var type = (!pos && isIntersects === 2 ? 'img' : 'canvas');
                                tile = layer.gmxGetTile(tilePoint, type, imageObj);
                                if(type === 'canvas') {
                                    tile.width = tile.height = 256; // TODO: убрать повторные отрисовки
                                    var ctx = tile.getContext('2d');
                                    if(pos) {
                                        var canvas = document.createElement('canvas');
                                        canvas.width = canvas.height = 256;
                                        var ptx = canvas.getContext('2d');
                                        ptx.drawImage(imageObj, Math.floor(pos.x), Math.floor(pos.y), pos.size, pos.size, 0, 0, 256, 256);
                                        imageObj = canvas;
                                    }

                                    var pattern = ctx.createPattern(imageObj, "no-repeat");
                                    ctx.fillStyle = pattern;
                                    if(isIntersects === 2) ctx.fillRect(0, 0, 256, 256);
                                    else {
                                        if(!gmxAPI._leaflet.zoomCurrent) utils.chkZoomCurrent(zoom);
                                        drawCanvasPolygon( ctx, gmxTilePoint.x, gmxTilePoint.y, attr.mercGeom, opt);
                                    }
                                    ctx.fill();
                                }
                            }
                        }
                        if(opt._needLoadTile < 1) {
                            delete gmxAPI._leaflet.renderingObjects[opt.nodeID];
                            utils.waitChkIdle(0, 'RasterLayer ' + layer._animating);					// Проверка отрисовки карты
                            if(layer._clearBgBufferTimer) clearTimeout(layer._clearBgBufferTimer);
                            layer._clearBgBufferTimer = setTimeout(L.bind(layer._clearBgBuffer, layer), 500);
                            //console.log('_needLoadTile', opt._needLoadTile);
                        }
                    }
                    ,zoom: {
                        from: zoom
                    }
                    ,x: gmxTilePoint.x
                    ,y: gmxTilePoint.y
                });
			}
			,
			updateTilesPosition: function (tile) {
                if (!this._map || gmxAPI._leaflet['zoomstart']) return;
                if(!gmxAPI._leaflet['zoomCurrent']) utils.chkZoomCurrent();
                var zoomCurrent = gmxAPI._leaflet.zoomCurrent;
                var mInPixel = zoomCurrent.mInPixel;
                var shiftX = mInPixel * (this.options.shiftX || 0);     // сдвиг тайлов
                var shiftY = mInPixel * (this.options.shiftY || 0);
                var shiftOSM = (this.options.shiftOSM ? this.options.shiftOSM : 0);		// Сдвиг для OSM
                shiftY -= shiftOSM;
                var arr = [tile];
                if(!tile) {
                    arr = [];
                    for(var tKey in this._tiles) arr.push(this._tiles[tKey]);
                }
                for (var i = 0, len = arr.length; i < len; i++) {
                    var tile = arr[i];
                    var tilePos = this._getTilePos(tile._tilePoint);
                        tilePos.x += shiftX;
                        tilePos.y -= shiftY;
                        L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);
                }
			}
			,
			gmxGetTile: function (tilePoint, type, img) {
				var tKey = tilePoint.x + ':' + tilePoint.y;
                if(tKey in this._tiles) return this._tiles[tKey];
				if (!this._map) {
					//console.log('getCanvasTile: ', this);
				}
                
				var tile = this._createTile(type, img);
				tile.id = tKey;
				tile._layer = this;
				tile._tilePoint = tilePoint;
				var tilePos = this._getTilePos(tilePoint);

                var zoomCurrent = gmxAPI._leaflet.zoomCurrent;
                var mInPixel = zoomCurrent.mInPixel;
                var shiftX = mInPixel * (this.options.shiftX || 0); // сдвиг тайлов
                var shiftY = mInPixel * (this.options.shiftY || 0);
                var shiftOSM = (this.options.shiftOSM ? this.options.shiftOSM : 0);		// Сдвиг для OSM
                shiftY -= shiftOSM;
                tilePos.x += shiftX;
                tilePos.y -= shiftY;
                L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome || L.Browser.android23);
                if(gmxAPI.isMobile) tile.style.webkitTransform += ' scale3d(1.003, 1.003, 1)';
				this._tiles[tKey] = tile;
				this._tileContainer.appendChild(tile);

                this._tileOnLoad.call(tile);
                tile._tileComplete = true;					// Added by OriginalSin
				this._tileLoaded();

				return this._tiles[tKey];
			}
			,
			_createTile: function (type, img) {
                var tile = null;
				if(type === 'img') {
					tile = (img ? img.cloneNode(true) : L.DomUtil.create('img', 'leaflet-tile'));
                    tile.className = 'leaflet-tile';
					//img.galleryimg = 'no';
				} else {
					tile = L.DomUtil.create('canvas', 'leaflet-tile');
					tile.width = tile.height = 256;
				}
				return tile;
			}
		});

		// Растровый для OSM
		L.TileLayer.OSMcanvas = L.TileLayer.ScanExCanvas;
	}
		
	//расширяем namespace
	if(!gmxAPI._leaflet) gmxAPI._leaflet = {};
	gmxAPI._leaflet['setBackgroundTiles'] = setBackgroundTiles;				// Добавить растровый слой
})();
