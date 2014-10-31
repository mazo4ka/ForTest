/** Менеджер управления балунами

Позволяет управлять балунами на карте. 

@memberof map
*/
(function()
{
    /**
     * Менеджер управления балунами (создаётся в API и доступен через свойство карты map.balloonClassObject).
     * @constructor BalloonClass
     */
	function BalloonClass()
	{
		var map = gmxAPI.map;
		var div = gmxAPI._div;
		var apiBase = gmxAPI.getAPIFolderRoot();
		var balloons = [];
        map.balloons = balloons;
		var curMapObject = null;

		var mapX = 0;
		var mapY = 0;
		var stageZoom = 1;						// Коэф. масштабирования браузера
		var scale = 0;
		//map.getPosition();
		var currPos = null;

		// Обновить информацию текущего состояния карты
		function refreshMapPosition(ph)
		{
			currPos = ph || gmxAPI.currPosition || map.getPosition();
			mapX = currPos['x'];
			mapY = currPos['y'];
			scale = gmxAPI.getScale(currPos['z']);
			stageZoom =  currPos['stageHeight'] / div.clientHeight;	// Коэф. масштабирования браузера
		}
		// Формирование ID балуна
		function setID(o)
		{
			var id = o.objectId + '_balloon';
			if(o.properties) {
				var identityField = gmxAPI.getIdentityField(o);
				if(o.properties[identityField]) id +=  '_' + o.properties[identityField];
			}
			return id;
		}

		function chkBalloonText(text, div)
		{
			var type = typeof(text);
			if(type === 'string') div.innerHTML = '<div style="white-space: nowrap;">' + text + '</div>';
			else if(type === 'boolean' && text) div.innerHTML = ""; // затираем только если true
			// в случае type === 'object' ничего не делаем
		}

		function callBalloonHook(o, div) {
            var spans = div.getElementsByTagName("span");
            
            //собираем статистику применения хуков в шаблоне
            var hooksCount = {};
            for(var key in o._balloonHook) {
                var hookID = o._balloonHook[key].hookID;
                hooksCount[key] = 0;
                for (var i = 0, len = spans.length; i < len; i++) {
                    if (spans[i].id === hookID) {
                        hooksCount[key]++;
                    }
                }
            }
            
            for(var key in o._balloonHook) {
                var hook = o._balloonHook[key],
                    //st = '[' + key + ']',
                    fid = hook.hookID,
                    notFound = true;
                for (var i = 0, len = spans.length; i < len; i++) {
                    var node = spans[i];
                    if(node.id === fid) {
                        notFound = false;
                        //node.innerHTML = node.innerHTML.replace(st, '');
                        node.id += '_' + i;
                        hook.callback(o, div, node, hooksCount);
                    }
                }
                if(notFound) hook.callback(o, div, null, hooksCount);
            }
        }
        
		// Текст по умолчанию для балуна (innerHTML)
		function getDefaultBalloonText(o, attr)
		{
			var text = "";
			var identityField = gmxAPI.getIdentityField(o);
			var props = gmxAPI.clone(o.properties);
            if(o._balloonHook) {
                for(var key in o._balloonHook) {
                    props[key] = gmxAPI.applyTemplate(o._balloonHook[key].resStr, props);
                }
            }

			for (var key in props)
			{
				if (key != identityField)
				{
					var value = "" + props[key];
                    if(!o._balloonHook) {
                        if (value.indexOf("http://") == 0)
                            value = "<a href='" + value + "'>" + value + "</a>";
                        else if (value.indexOf("www.") == 0)
                            value = "<a href='http://" + value + "'>" + value + "</a>";
                    }
                    if (key in o.properties) {
                        text += "<b>" + key + ":</b> " + value + "<br />";
                    }
				}
			}
			var summary = o.getGeometrySummary();
			if(summary != '') text += "<br />" + summary;
			return text;
		}
		this.getDefaultBalloonText = getDefaultBalloonText;

		// Проверка наличия параметра по ветке родителей
		function chkAttr(name, o)
		{
			var attr = false;
			var hash = o._hoverBalloonAttr;
			if(hash && name in hash) {
				attr = hash[name];
			}
			if(!attr && o.parent) attr = chkAttr(name, o.parent);
			return attr;
		}
/*
		function setDelayHide()
		{
			if(propsBalloon.delayHide) clearTimeout(propsBalloon.delayHide);
			propsBalloon.delayHide = setTimeout(function()
			{
				propsBalloon.chkMouseOut();
				clearTimeout(propsBalloon.delayHide);
				propsBalloon.delayHide = false;
			}, 100);
		}
		function setDelayShow(text, o)
		{
			if(propsBalloon.delayShow) clearTimeout(propsBalloon.delayShow);
			propsBalloon.delayShow = setTimeout(function()
			{
				propsBalloon.updatePropsBalloon(text);
				clearTimeout(propsBalloon.delayShow);
				propsBalloon.delayShow = false;
                if(o._balloonHook) o._balloonHook.callback(o, balloon.div);
			}, 200);
		}
*/

		function disableHoverBalloon(mapObject)
		{
			var listenersID = mapObject._attr['balloonListeners'];
			for (var key in listenersID) {
				mapObject.removeListener(key, listenersID[key]);
			}
			mapObject._attr['balloonListeners'] = {};
		}
		this.disableHoverBalloon = disableHoverBalloon;

        /** Установка режима пользовательского балуна
        * @memberOf BalloonClass#
        * @param {MapObject} mapObject - обьект карты для которого устанавливается режим балуна.
        * @param {object} callback - пользовательский метод формирования содержимого балуна.
        * @param {object} attr - атрибуты управления балуном.
        * @param {boolean} attr.disableOnMouseOver - отключить балун при наведении указателя(по умолчанию равен false).
        * @param {boolean} attr.disableOnClick - отключить балун при click(по умолчанию равен false).
        * @param {boolean} attr.maxFixedBallons - максимальное количество фиксированных балунов(по умолчанию равен 1).
        */
		function enableHoverBalloon(mapObject, callback, attr)
		{
			var _this = this;
			mapObject._hoverBalloonAttr = (attr ? attr : {});				// Атрибуты управления балуном
			if (callback) {													// Пользовательский метод получения текста для балуна
				this.getDefaultBalloonText = mapObject._hoverBalloonAttr['callback'] = callback;
			} else {
				delete mapObject._hoverBalloonAttr['callback'];
			}

			var handlersObj = {
				onMouseOver: function(o, keyPress)
				{
					if('obj' in o) {
						//if('attr' in o && 'textFunc' in o.attr) keyPress = o.attr;
						if('attr' in o) keyPress = o.attr;
						o = o.obj;
					}
					gmxAPI.contDivPos = {
						'x': gmxAPI.getOffsetLeft(div),
						'y': gmxAPI.getOffsetTop(div)
					};
					if(keyPress && (keyPress['shiftKey'] || keyPress['ctrlKey'])) return false;	// При нажатых не показываем балун
					if (map.isDragging())
						return false;

					if(chkAttr('disableOnMouseOver', mapObject)) {			// Проверка наличия параметра disableOnMouseOver по ветке родителей 
						return false;
					}
					var customBalloonObject = chkAttr('customBalloon', mapObject);		// Проверка наличия параметра customBalloon по ветке родителей 
					if(customBalloonObject) {
						currPos = gmxAPI.currPosition || map.getPosition();
						currPos._x = propsBalloon.mouseX || 0;
						currPos._y = propsBalloon.mouseY || 0;
						var flag = customBalloonObject.onMouseOver(o, keyPress, currPos); // Вызов пользовательского метода вместо или перед балуном
						if(flag) return false;										// Если customBalloon возвращает true выходим
					}

                    if(!o._balloonHook && o.filter && o.filter._balloonHook) o._balloonHook = o.filter._balloonHook;
					//if(keyPress['objType'] == 'cluster') {}; // Надо придумать как бороться с фикс.двойником

					var textFunc = chkAttr('callback', mapObject);			// Проверка наличия параметра callback по ветке родителей 
					if(keyPress) {
						if('textFunc' in keyPress) textFunc = keyPress['textFunc'];
					}
					//var text = (textFunc && (!keyPress['objType'] || keyPress['objType'] != 'cluster') ? textFunc(o, propsBalloon.div) : getDefaultBalloonText(o));
					var text = (textFunc ? textFunc(o, propsBalloon.div) : getDefaultBalloonText(o));
					if(typeof(text) == 'string' && text == '') return false;
					var id = setID(o);
					lastHoverBalloonId = o.objectId;
					
					//if(propsBalloon.delayHide) { clearTimeout(propsBalloon.delayHide); propsBalloon.delayHide = false; }
					if (!fixedHoverBalloons[id]) {
                        if(propsBalloon.delayShow) clearTimeout(propsBalloon.delayShow);
                        propsBalloon.delayShow = setTimeout(function()
                        {
                            propsBalloon.updatePropsBalloon(text);
                            clearTimeout(propsBalloon.delayShow);
                            propsBalloon.delayShow = false;
                            if(o._balloonHook) {
                                callBalloonHook(o, propsBalloon.div)
                            }
                        }, 200);
						//setDelayShow(text);
						//propsBalloon.updatePropsBalloon(text);
					}
					else {
						propsBalloon.updatePropsBalloon(false);
					}

					map.clickBalloonFix = clickBalloonFix;
					return false;
				},
				onMouseOut: function(o) 
				{
					if('obj' in o) {
						o = o.obj;
					}
					var customBalloonObject = chkAttr('customBalloon', mapObject);		// Проверка наличия параметра customBalloon по ветке родителей 
					if(customBalloonObject) {
						var flag = customBalloonObject.onMouseOut(o);
						if(flag) return false;
					}
					if (lastHoverBalloonId == o.objectId) {
						//setDelayHide();
						if(propsBalloon.delayShow) { clearTimeout(propsBalloon.delayShow); propsBalloon.delayShow = false; }
						propsBalloon.updatePropsBalloon(false);
					}
					return false;
				},
				onClick: function(o, keyPress)
				{
					if('obj' in o) {
						if('attr' in o) keyPress = o.attr;
						//if('attr' in o && 'textFunc' in o.attr) keyPress = o.attr;
						o = o.obj;
						if('propForBalloon' in keyPress) o.properties = keyPress.propForBalloon;
					}

					refreshMapPosition();
					var customBalloonObject = chkAttr('customBalloon', mapObject);		// Проверка наличия параметра customBalloon по ветке родителей 
					if(customBalloonObject) {
						currPos._x = propsBalloon.x;
						currPos._y = propsBalloon.y;
						var flag = customBalloonObject.onClick(o, keyPress, currPos);
						if(flag) return false;
					}
					if(chkAttr('disableOnClick', mapObject)) {			// Проверка наличия параметра disableOnMouseOver по ветке родителей 
						return false;
					}
					if(!keyPress) keyPress = {};
					if(keyPress['objType'] === 'cluster') {
						if('clusters' in o) keyPress['textFunc'] = o.clusters.getTextFunc();
						if(keyPress['members']) o['members'] = keyPress['members'];	// члены кластера 
					}
					if(!keyPress['textFunc']) keyPress['textFunc'] = chkAttr('callback', mapObject);			// Проверка наличия параметра callback по ветке родителей 
                    hideHoverBalloons(null, {from: 'hide', remove: true});
					return clickBalloonFix(o, keyPress);
				}
			};

			if(mapObject == map) return;								// На map Handlers не вешаем
			if(mapObject._hoverBalloonAttr) {							// есть юзерские настройки балунов
				if(mapObject._hoverBalloonAttr['disableOnMouseOver']) {			// для отключения балунов при наведении на обьект
					handlersObj['onMouseOver'] = null;
					handlersObj['onMouseOut'] = null;
				}
				if(mapObject._hoverBalloonAttr['disableOnClick']) {				// для отключения фиксированных балунов
					handlersObj['onClick'] = null;
				}
				//mapObject._hoverBalloonAttr['disableOnMouseOver']
			}
			//mapObject.setHandlers(handlersObj);
			if(!mapObject._attr['balloonListeners']) mapObject._attr['balloonListeners'] = {};
			disableHoverBalloon(mapObject);
			var level = (attr && attr['level'] ? attr['level'] : -10);
			for (var key in handlersObj) {
				if(handlersObj[key]) {
					var eID = mapObject.addListener(key, handlersObj[key], level);
					mapObject._attr['balloonListeners'][key] = eID;
					//gmxAPI._listeners.bringToBottom(mapObject, key, eID);
				}
			}
		}
		this.enableHoverBalloon = enableHoverBalloon;

		var lastHoverBalloonId = false;
		var fixedHoverBalloons = {};

		function showHoverBalloons()
		{
			for (var key in fixedHoverBalloons)
			{
				var balloon = fixedHoverBalloons[key];
				balloon.setVisible(true);
			}
			positionBalloons();
			for (var key in userBalloons)
			{
				var balloon = userBalloons[key];
				if(balloon._needShow) {
					balloon.setVisible(true);
					delete balloon._needShow;
				}
			}
		}
		this.showHoverBalloons = showHoverBalloons;
		
		function removeHoverBalloons()
		{
			for (var key in fixedHoverBalloons)
			{
				fixedHoverBalloons[key].remove();
				delete fixedHoverBalloons[key];
			}
			gmxAPI._mouseOnBalloon = false;
		}
		this.removeHoverBalloons = removeHoverBalloons;
		
		function hideHoverBalloons(flag, attr)
		{
			if(propsBalloon.isVisible()) propsBalloon.setVisible(false);
			var showFlag = false;
			if(!attr) attr = {};
			for (var key in fixedHoverBalloons)
			{
				var balloon = fixedHoverBalloons[key];
				if(!attr.removeAll && balloon.objType != 'cluster') {
					if(attr.from && balloon.pID != attr.from) continue;
					if(attr.remove) balloon.remove();
					else {
                        balloon.setVisible(false);
                        showFlag = true;
                    }
				}
				else
				{
					fixedHoverBalloons[key].remove();
					delete fixedHoverBalloons[key];
				}
			}
			gmxAPI._mouseOnBalloon = false;
			if(attr.from) return;

			for (var key in userBalloons)
			{
				var balloon = userBalloons[key];
				if(balloon.isVisible) {
					balloon.setVisible(false);
					balloon._needShow = true;
				}
			}
			
/*
			if(flag && showFlag) {
				var timeoutShowHoverBalloons = setTimeout(function()
				{
					clearTimeout(timeoutShowHoverBalloons);
					showHoverBalloons();
				}, 300);
			}
*/
		}
		this.hideHoverBalloons = hideHoverBalloons;

		// Фиксация балуна
		function clickBalloonFix(o, keyPress)
		{
			var OnClickSwitcher = chkAttr('OnClickSwitcher', o);		// Проверка наличия параметра по ветке родителей 
			if(OnClickSwitcher && typeof(OnClickSwitcher) == 'function') {
				var flag = OnClickSwitcher(o, keyPress);				// Вызов пользовательского метода вместо или перед балуном
				if(flag) return true;										// Если OnClickSwitcher возвращает true выходим
			}

			if(chkAttr('disableOnClick', o))	// Проверка наличия параметра disableOnClick по ветке родителей 
				return false;

			var textFunc = chkAttr('clickCallback', o) || chkAttr('callback', o);	// Проверка наличия параметра callback по ветке родителей 
			if(keyPress) {
				if(keyPress['shiftKey'] || keyPress['ctrlKey']) return false;	// При нажатых не показываем балун
				if(keyPress['nodeFilter'] == o.parent.objectId && o.parent._hoverBalloonAttr.callback) textFunc = o.parent._hoverBalloonAttr.callback; // взять параметры балуна от фильтра родителя
				else if('textFunc' in keyPress) textFunc = keyPress['textFunc'];
			}

			var id = setID(o);
			if (!fixedHoverBalloons[id])
			{
				var maxFixedBallons = chkAttr('maxFixedBallons', o) || 1;	// Проверка наличия параметра maxFixedBallons по ветке родителей
				if(maxFixedBallons > 0 && balloons.length > 0)
				{
					if(maxFixedBallons <= balloons.length) {
						var balloon = null;
						for(var i=0; i<balloons.length; i++) {
							if(balloons[i].notDelFlag) continue;
							balloon = balloons[i];
							break;
						}
						if(balloon) {
							var fixedId = balloon.fixedId;
							balloon.remove();
							delete fixedHoverBalloons[fixedId];
						}
					}
				}
				var balloon = addBalloon();
				balloon.setVisible(false);
				balloon.pID = o.parent.objectId;
				if(o.parent && o.parent.parent && o.parent.parent.filters) {
                    balloon.pID = o.parent.parent.objectId;
                    balloon.filter = o.parent;
                    balloon.layer = o.parent.parent;
				}
                balloon.obj = o;
				balloon.fixedId = id;
				balloon.keyPress = keyPress;

				o.balloon = balloon;
				if(keyPress && keyPress['objType']) balloon.objType = keyPress['objType'];

                if(!o._balloonHook && o.filter && o.filter._balloonHook) o._balloonHook = o.filter._balloonHook;
				var text = (textFunc ? textFunc(o, balloon.div) : getDefaultBalloonText(o));
				if(typeof(text) == 'string' && text == '') return false;

				var mx = map.getMouseX();
				var my = map.getMouseY();
				
				if(gmxAPI.proxyType == 'flash') {
					mx = gmxAPI.chkPointCenterX(mx);
				}

				if(balloon.objType === 'cluster') {
                    keyPress.dx = keyPress.dy = 0;
				// } else if(o.getGeometryType() == 'POINT') {
					// var gObj = o.getGeometry();
					// var x = gObj.coordinates[0];
					// var y = gObj.coordinates[1];

					//balloon.fixedDeltaX =  (gmxAPI.merc_x(mx) -  gmxAPI.merc_x(x))/scale;
					//balloon.fixedDeltaY =  (gmxAPI.merc_y(my) -  gmxAPI.merc_y(y))/scale;
					// mx = x;
					// my = y;
					//balloon.fixedDeltaFlag = true;
				}

				balloon.setVisible(true);
				balloon.setPoint(mx, my);
				chkBalloonText(text, balloon.div);
                if(o._balloonHook) {
                    callBalloonHook(o, balloon.div)
                }

				balloon.resize();
				fixedHoverBalloons[id] = balloon;
			}
			else
			{
				fixedHoverBalloons[id].remove();
				delete fixedHoverBalloons[id];
			}
			propsBalloon.updatePropsBalloon(false);
			if(propsBalloon.delayShow) { clearTimeout(propsBalloon.delayShow); propsBalloon.delayShow = false; }
			return true;
		}
		this.clickBalloonFix = clickBalloonFix;

		// Создание DIV и позиционирование балуна
		function createBalloon(outerFlag)
		{
			var tlw = 14;
			var tlh = 14;
			var blw = 14;
			var blh = 41;
			var trw = 18;
			var trh = 13;
			var brw = 20;
			var brh = 41;
			var th = 2;
			var lw = 2;
			var bh = 2;
			var rw = 2;

			var legWidth = 68;

			var balloon = gmxAPI.newStyledDiv({
				position: "absolute",
				'font-family': 'Times New Roman',
/*
				paddingLeft: lw + "px",
				paddingRight: rw + "px",
				paddingTop: th + "px",
				paddingBottom: bh + "px",
*/
				width: "auto",
				//whiteSpace: "nowrap",
				zIndex: 1000
			});
			//if(outerFlag || gmxAPI.proxyType !== 'leaflet') {
				balloon.className = 'gmx_balloon';
				div.appendChild(balloon);
			//} else {
			//	balloon.className = 'gmx_balloon leaflet-pan-anim leaflet-zoom-animated';
			//	gmxAPI._leaflet.LMap['_mapPane'].appendChild(balloon);
			//}

			var css = {
				'table': 'background-color: transparent; width: auto; margin: 2px; border-collapse: collapse; font-size: 11px; font-family: sans-serif;',
				'bg_top_left': 'background-color: transparent; width: 13px; height: 18px; border: 0px none; padding: 1px; display: block; background-position: 2px 9px; background-image: url(\''+apiBase+'img/tooltip-top-left.png\'); background-repeat: no-repeat;',
				'bg_top': 'background-color: transparent; height: 18px; border: 0px none; padding: 0px; background-position: center 9px; background-image: url(\''+apiBase+'img/tooltip-top.png\'); background-repeat: repeat-x;',
				'bg_top_right': 'background-color: transparent; width: 18px; height: 18px; border: 0px none; padding: 1px; display: block; background-position: -5px 9px; background-image: url(\''+apiBase+'img/tooltip-top-right.png\'); background-repeat: no-repeat;',
				'bg_left': 'background-color: transparent; width: 13px; border: 0px none; padding: 1px; background-position: 2px top; background-image: url(\''+apiBase+'img/tooltip-left.png\'); background-repeat: repeat-y;',
				'bg_center': 'background-color: transparent; width: 50px; min-width: 50px; border: 0px none; background-color: white; padding: 4px; padding-right: 14px;',
				'bg_right': 'background-color: transparent; width: 13px; height: 18px; border: 0px none; padding: 1px; background-position: 0px top; background-image: url(\''+apiBase+'img/tooltip-right.png\'); background-repeat: repeat-y;',
				'bg_bottom_left': 'background-color: transparent; width: 13px; height: 18px; border: 0px none; padding: 1px; background-position: 2px top; background-image: url(\''+apiBase+'img/tooltip-bottom-left.png\'); background-repeat: no-repeat;',
				'bg_bottom': 'background-color: transparent; height: 18px; border: 0px none; padding: 1px; background-position: center top; background-image: url(\''+apiBase+'img/tooltip-bottom.png\'); background-repeat: repeat-x;',
				'bg_bottom_right': 'background-color: transparent; width: 18px; height: 18px; border: 0px none; padding: 1px; background-position: -2px top; background-image: url(\''+apiBase+'img/tooltip-bottom-right.png\'); background-repeat: no-repeat;',
				'leg': 'bottom: 18px; left: 0px; width: 68px; height: 41px; position: relative; background-repeat: no-repeat; background-image: url(\''+apiBase+'img/tooltip-leg.png\');'
			};

			var transp = '';
			if(gmxAPI.isChrome || gmxAPI.isIE) transp =  '<img width="10" height="10" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABBJREFUeNpi+P//PwNAgAEACPwC/tuiTRYAAAAASUVORK5CYII=">';	// Для Chrome добавляем невидимый контент в TD
			var body = 
				'<table cols="3" cellspacing="0" cellpadding="0" border="0" style="'+css['table']+'">'+
					'<tr>'+
						'<td style="'+css['bg_top_left']+'">'+transp+'</td>'+
						'<td style="'+css['bg_top']+'">'+transp+'</td>'+
						'<td style="'+css['bg_top_right']+'">'+transp+'</td>'+
					'</tr>'+
					'<tr>'+
						'<td style="'+css['bg_left']+'">'+transp+'</td>'+
						'<td style="'+css['bg_center']+'">'+
							'<div class="kosmosnimki_balloon">'+
							'</div>'+
						'</td>'+
						'<td style="'+css['bg_right']+'">'+transp+'</td>'+
					'</tr>'+
					'<tr>'+
						'<td style="'+css['bg_bottom_left']+'">'+transp+'</td>'+
						'<td style="'+css['bg_bottom']+'">'+transp+'</td>'+
						'<td style="'+css['bg_bottom_right']+'">'+transp+'</td>'+
					'</tr>'+
				'</table>';
			balloon.innerHTML = body;
			var nodes = balloon.getElementsByTagName("div");
			var balloonText = nodes[0];
			
			var imgStyle =	{
				position: "absolute",
				pointerEvents: "none",
				bottom: "-21px",
				right: "15px"
			};
			if(document.doctype) {
				//if(gmxAPI.isChrome || gmxAPI.isSafari || gmxAPI.isIE) 
				if(!window.opera) imgStyle["bottom"] = "-19px";
			} else if(gmxAPI.isIE && document.documentMode >= 8) imgStyle["bottom"] = "-19px";
			var leg = gmxAPI.newElement("img",
				{
					className: 'gmx_balloon_leg',
					src: apiBase + "img/tooltip-leg.png"
				},
				imgStyle
			);
			balloon.appendChild(leg);

			var x = 0;
			var y = 0;
			var legX = null;
			var bposX = 0;
			var bposY = 0;
			var reposition = function()	
			{
				//if(!wasVisible) return;
				var ww = balloon.clientWidth;
				var hh = balloon.clientHeight;
				balloon.style.visibility = (ww == 0 || hh ==0 ? 'hidden' : 'visible'); 

				var screenWidth = div.clientWidth;
				var yy = div.clientHeight - y + 20;

				var xx = (x + ww < screenWidth) ? x : (ww < screenWidth) ? (screenWidth - ww) : 0;
				xx = Math.max(xx, x - ww + legWidth + brw);
				var dx = x - xx;
				if(legX != dx) leg.style.left = dx + "px";
				legX = dx;
				xx += 2;

				if(bposX != xx || bposY != yy) {
					if(balloon.parentNode != div) gmxAPI.position(balloon, xx, yy);
					else gmxAPI.bottomPosition(balloon, xx, yy);
				}
				bposX = xx;
				bposY = yy;
			}

			var updateVisible = function(flag)	
			{
				gmxAPI.setVisible(balloon, flag);
				if (flag && !wasVisible) {
					ret.resize();
				}
				wasVisible = flag;
			}
			var isVisible = function()	
			{
				return wasVisible;
			}

			var wasVisible = true;
			var setMousePos = function(x_, y_)	
			{
				x = this.mouseX = x_;
				y = this.mouseY = y_;
			}

			var ret = {						// Возвращаемый обьект
				outerDiv: balloon,
				div: balloonText,
				leg: leg,
				mouseX: 0,
				mouseY: 0,
				//delayHide: false,
				delayShow: false,
				isVisible: isVisible,
				setVisible: updateVisible,
				setMousePos: setMousePos,
				setScreenPosition: function(x_, y_)
				{
					setMousePos(x_, y_);
					if(wasVisible) reposition();
				},
				resize: function() {
					reposition();
				},
				getDefaultText: function(o) {
                    return getDefaultBalloonText(o || this.obj);
				},
				updatePropsBalloon: function(text)
				{
					//ret.outerDiv.style.pointerEvents = 'none';
					updateVisible((text && !buttons ? true : false));
					chkBalloonText(text, balloonText);
					reposition();
				},
				chkMouseOut: function()
				{
					if(propsBalloon.delayHide) updateVisible(false);
				}
				,
				stateListeners: {},
				addListener: function(eventName, func) { return gmxAPI._listeners.addListener({'obj': this, 'eventName': eventName, 'func': func}); },
				removeListener: function(eventName, id)	{ return gmxAPI._listeners.removeListener(this, eventName, id); }
			};
			return ret;
		}

		var propsBalloon = createBalloon(true);		// Balloon для mouseOver
		this.propsBalloon = propsBalloon;
		propsBalloon.setVisible(false);
		propsBalloon.outerDiv.style.zIndex = 10000;
		propsBalloon.outerDiv.style.display = "none";

/*
		document.onmouseover = function(ev)
		{
			var event = gmxAPI.compatEvent(ev);
			if(event && event.target != propsBalloon.leg) setDelayHide();
		}
		document.onmouseout = function(event)
		{
			if(!gmxAPI.contDivPos) return;
			var minx = gmxAPI.contDivPos['x'];
			var maxx = minx + gmxAPI._div.clientWidth;
			var eventX = gmxAPI.eventX(event);
			var miny = gmxAPI.contDivPos['y'];
			var maxy = miny + gmxAPI._div.clientHeight;
			var eventY = gmxAPI.eventY(event);
			if(eventX >= minx && eventX <= maxx && eventY >= miny && eventY <= maxy) return;
			propsBalloon.outerDiv.style.display = "none";
		}
*/
		div.onmouseout = function(ev)		// скрыть балун по наведению если мышь ушла
		{
			if(gmxAPI.proxyType === 'leaflet') return;
			if(propsBalloon.isVisible()) {
				var event = gmxAPI.compatEvent(ev);
				var tg = gmxAPI.compatTarget(event);
				var reltg = event.toElement || event.relatedTarget;
				while (reltg && (reltg != document.documentElement))
				{
					if (reltg == propsBalloon.outerDiv) {
						return;
					}
					reltg = reltg.offsetParent;
				}
				while (tg && (tg != document.documentElement))
				{
					if (tg == propsBalloon.outerDiv)
						return;
					tg = tg.offsetParent;
				}
				propsBalloon.outerDiv.style.display = "none";
			}
		}

		var positionBalloons = function(ph)	
		{
			if(balloons.length < 1) return;
			refreshMapPosition(ph);
			balloons.sort(function(b1, b2)
			{
				return b1.isHovered ? 1 : b2.isHovered ? -1 : (b2.geoY - b1.geoY);
			});
			for (var i = 0; i < balloons.length; i++)
			{
				var bal = balloons[i];
				bal.reposition();
				if(bal.outerDiv.style.zIndex != 1000 + i) bal.outerDiv.style.zIndex = 1000 + i;
			}
		}

		//map.addObject().setHandler("onMove", positionBalloons);
		gmxAPI.contDivPos = null;
		var eventXprev = 0; 
		var eventYprev = 0;
		var buttons = false;
		var mouseMoveTimer = null;
		var onmousemove = function(ev)
		{
			var px = 0;
			var py = 0;
			if(gmxAPI._leaflet && gmxAPI._leaflet['containerPoint']) {
				px = gmxAPI._leaflet['containerPoint']['x'];
				py = gmxAPI._leaflet['containerPoint']['y'];
			} else {
				var event = gmxAPI.compatEvent(ev);
				if(!event) return;
				//buttons = event.buttons;
				var eventX = gmxAPI.eventX(event);
				var eventY = gmxAPI.eventY(event);
				if(eventX == eventXprev && eventY == eventYprev) return;
				eventXprev = eventX; 
				eventYprev = eventY;
				px = eventX;
				py = eventY;
				gmxAPI.contDivPos = {
					'x': gmxAPI.getOffsetLeft(div),
					'y': gmxAPI.getOffsetTop(div)
				};
				px -= gmxAPI.contDivPos['x']; 
				py -= gmxAPI.contDivPos['y'];
			}
			propsBalloon.setScreenPosition(px, py);
		}

		gmxAPI._div.onmousemove = function(ev)
		{
			if(gmxAPI.mousePressed) return;
			onmousemove(ev);
		};
		
		gmxAPI.map.addListener('positionChanged', function(ph)
			{
				if(ph && ph.currZ != Math.floor(ph.currZ)) return;
				positionBalloons();
			}
		, -10);
		
		gmxAPI.map.addListener('onResizeMap', function()
			{
/*			
				gmxAPI.contDivPos = {
					'x': gmxAPI.getOffsetLeft(div),
					'y': gmxAPI.getOffsetTop(div)
				};
*/
				gmxAPI.contDivPos = {
					'x': div.offsetLeft,
					'y': div.offsetTop
				};
				positionBalloons();
			}
		, -10);
		
		function addBalloon(_notDelFlag)
		{
			var balloon = createBalloon();
			balloon.notDelFlag = _notDelFlag;
			balloon.geoX = 0;
			balloon.geoY = 0;
			balloon.isDraging = false;
			balloon.isRemoved = false;
			
			var oldSetVisible = balloon.setVisible;
			balloon.outerDiv.onmouseover = function(ev)
			{
				balloon.isHovered = true;
				positionBalloons();
				gmxAPI._mouseOnBalloon = true;
				if(propsBalloon.isVisible()) {
					propsBalloon.setVisible(false);
					gmxAPI._listeners.dispatchEvent('hideHoverBalloon', gmxAPI.map, {});
				}
			}
			balloon.outerDiv.onmouseout = function()
			{
				balloon.isHovered = false;
				positionBalloons();
				gmxAPI._mouseOnBalloon = false;
			}
			balloon.outerDiv.appendChild(gmxAPI.newElement(
				"img",
				{
					src: apiBase + "img/close.png",
					title: gmxAPI.KOSMOSNIMKI_LOCALIZED("Закрыть", "Close"),
					onclick: function(ev) 
					{ 
						if(balloon.notDelFlag) {
							balloon.setVisible(false);
						}
						else
						{
							balloon.remove();
							balloon.isVisible = false;
						}
						gmxAPI.stopEvent(ev);
						gmxAPI._mouseOnBalloon = false;
						gmxAPI._listeners.dispatchEvent('onClose', balloon, false);
					},
					onmouseover: function()
					{
						this.src = apiBase + "img/close_orange.png";
					},
					onmouseout: function()
					{
						this.src = apiBase + "img/close.png";
					}
				},
				{
					position: "absolute",
					top: "15px",
					right: "15px",
					cursor: "pointer"
				}
			));
			balloon.isVisible = true;
			balloon.reposition = function()
			{
				if (balloon.isVisible)
				{
					refreshMapPosition();

					var sc = scale * stageZoom;
					
					// Смещение Балуна к центру
					var deltaX = 0;
					if(!balloon.isDraging && gmxAPI.proxyType === 'flash') {
						var pos = gmxAPI.chkPointCenterX(this.geoX);
						var centrGEO = gmxAPI.from_merc_x(mapX);
						
						var mind = Math.abs(pos - centrGEO);
						for(var i = 1; i<4; i++) {
							var d1 = Math.abs(pos - centrGEO + i * 360);
							if (d1 < mind) { mind = d1; deltaX = i * 360; }
							d1 = Math.abs(pos - centrGEO - i * 360);
							if (d1 < mind) { mind = d1; deltaX = -i * 360; }
						}
						deltaX = gmxAPI.merc_x(deltaX) / sc;
					}

					var px = (mapX - gmxAPI.merc_x(balloon.geoX))/sc;
					var py = (mapY - gmxAPI.merc_y(balloon.geoY))/sc;
					var x = div.clientWidth/2 - px + deltaX;
					var y = div.clientHeight/2 + py;

					if(balloon.keyPress) {	// если задано смещение в пикселах
						if(balloon.keyPress.dx) x += balloon.keyPress.dx;
						if(balloon.keyPress.dy) y += balloon.keyPress.dy;
					}
					/*if(balloon.fixedDeltaFlag) {
						x += balloon.fixedDeltaX;
						y -= balloon.fixedDeltaY;
					}*/
					var flag = (y < 0 || y > div.clientHeight ? false : true);
					if (flag) {
						if (x < 0 || x > div.clientWidth) flag = false;
					}

					if (flag)
					{
						this.setScreenPosition(x, y);
						oldSetVisible(true);
					}
					else
						oldSetVisible(false);
				}
				else
				{
					oldSetVisible(false);
				}
			}
			balloon.setVisible = function(flag)
			{
				balloon.isVisible = flag;
				this.reposition();
				if(!flag) setTimeout(function() { gmxAPI._mouseOnBalloon = false; }, 20);
			}
			balloon.setPoint = function(x_, y_, isDraging_)
			{
				this.geoX = x_;
				this.geoY = y_;
				this.isDraging = isDraging_;
				positionBalloons();
			}
			balloon.remove = function()
			{
				gmxAPI._mouseOnBalloon = false;
				if(balloon.isRemoved) return false;
				if(balloon.fixedId) delete fixedHoverBalloons[balloon.fixedId];
				for(var i=0; i<balloons.length; i++) {
					if(balloons[i] == balloon) {
						balloons.splice(i, 1);
						break;
					}
				}
				if(this.outerDiv.parentNode) this.outerDiv.parentNode.removeChild(this.outerDiv);
				//div.removeChild(this.outerDiv);
				var gmxNode = gmxAPI.mapNodes[balloon.pID];		// Нода gmxAPI
				gmxAPI._listeners.dispatchEvent('onBalloonRemove', gmxNode, {'obj': balloon.obj});		// balloon удален
				balloon.isRemoved = true;
			}
			balloon.getX = function() { return this.geoX; }
			balloon.getY = function() { return this.geoY; }
			balloons.push(balloon);
			return balloon;
		}
		this.addBalloon = addBalloon;

        /** Установка параметров пользовательского балуна для фильтра слоя
        * @memberOf BalloonClass#
        * @param {Filter} filter - обьект фильтра слоя.
        * @param {object} balloonParams - параметры балуна для фильтра.
        * @param {boolean} balloonParams.DisableBalloonOnMouseMove - отключить балун при наведении указателя(по умолчанию равен false).
        * @param {boolean} balloonParams.DisableBalloonOnClick - отключить балун при click(по умолчанию равен false).
        * @param {String} balloonParams.Balloon - шаблон балуна(по умолчанию равен '').
        */
		var setBalloonFromParams = function(filter, balloonParams)
		{
/*			
			//по умолчанию балуны показываются
			if ( typeof balloonParams.BalloonEnable !== 'undefined' && !balloonParams.BalloonEnable )
			{
				disableHoverBalloon(filter);
				//return;
			}
*/			
			var balloonAttrs = {
				disableOnClick: balloonParams.DisableBalloonOnClick,
				disableOnMouseOver: balloonParams.DisableBalloonOnMouseMove
			}
			
			if ( balloonParams.Balloon )
			{
				filter['_balloonTemplate'] = balloonParams.Balloon;
				enableHoverBalloon(filter, function(o)
					{
                        var props = gmxAPI.clone(o.properties);
                        props.SUMMARY = o.getGeometrySummary();
                        if(o._balloonHook) {
                            for(var key in o._balloonHook) {
                                props[key] = gmxAPI.applyTemplate(o._balloonHook[key].resStr, props);
                            }
                        }

						var text = gmxAPI.applyTemplate(balloonParams.Balloon, props);
						text = text.replace(/\[SUMMARY\]/g, '');
						return text;
					}
					,
					balloonAttrs);
			}
			else
			{
				enableHoverBalloon(filter, null, balloonAttrs);
			}
		}
		this.setBalloonFromParams = setBalloonFromParams;
		
		//явно прописывает все свойства балунов в стиле.
		var applyBalloonDefaultStyle = function(balloonStyle)
		{
			var out = gmxAPI.clone(balloonStyle);
			//слой только что создали - всё по умолчанию!
			if (typeof out.BalloonEnable === 'undefined')
			{
				out.BalloonEnable = true;
				out.DisableBalloonOnClick = false;
				out.DisableBalloonOnMouseMove = true;
			} 
			else
			{
				//поддержка совместимости - если слой уже был, но новых параметров нет 
				if (typeof out.DisableBalloonOnClick === 'undefined')
					out.DisableBalloonOnClick = false;
					
				if (typeof out.DisableBalloonOnMouseMove === 'undefined')
					out.DisableBalloonOnMouseMove = false;
			}
			return out;
		}
		this.applyBalloonDefaultStyle = applyBalloonDefaultStyle;
	}

	var userBalloons = {};
	// Добавление прослушивателей событий
	gmxAPI._listeners.addListener({'level': -10, 'eventName': 'mapInit', 'func': function(map) {
			if(!gmxAPI.map || gmxAPI.map.balloonClassObject) return;
			gmxAPI.map.balloonClassObject = new BalloonClass();
			gmxAPI.map.addListener('zoomBy', function()	{ gmxAPI.map.balloonClassObject.hideHoverBalloons(true); });
			gmxAPI.map.addListener('hideBalloons', function(attr) { gmxAPI.map.balloonClassObject.hideHoverBalloons(null, attr); });
			gmxAPI.map.addListener('onMoveEnd', function() { gmxAPI.map.balloonClassObject.showHoverBalloons(); });

			gmxAPI.map.addListener('clickBalloonFix', function(o) { gmxAPI.map.balloonClassObject.clickBalloonFix(o); });
			gmxAPI.map.addListener('initFilter', function(data)
				{
					var fullStyle = gmxAPI.map.balloonClassObject.applyBalloonDefaultStyle(data['filter']['_attr']);
					gmxAPI.map.balloonClassObject.setBalloonFromParams(data['filter'], fullStyle);
				}
			);
			
			//расширяем FlashMapObject
			gmxAPI.extendFMO('addBalloon', function() {
				var balloon = map.balloonClassObject.addBalloon();
				var id = gmxAPI.newFlashMapId();
				balloon.fixedId = id;
				userBalloons[id] = balloon;
				return balloon;
			});
			gmxAPI.extendFMO('enableHoverBalloon', function(callback, attr) {
                if(this.filters) {
                    this.filters.forEach(function(item) {
                        map.balloonClassObject.enableHoverBalloon(item, callback, attr);
                    });
                } else {
                    map.balloonClassObject.enableHoverBalloon(this, callback, attr);
                }
            });
			gmxAPI.extendFMO('disableHoverBalloon', function() {
                if(this.filters) {
                    this.filters.forEach(function(item) {
                        map.balloonClassObject.disableHoverBalloon(item);
                    });
                } else {
                    map.balloonClassObject.disableHoverBalloon(this);
                }
            });
			gmxAPI.extendFMO('addBalloonHook', function(key, callback) {
                var hookID = gmxAPI.newFlashMapId();
                var res = {
                    key: key
                    ,hookID: hookID
                    ,resStr: "<span id='"+hookID+"'></span>"
                    ,callback: callback
                };
                if(this.filters) {
                    this.filters.forEach(function(item) {
                        if(!item._balloonHook) item._balloonHook = {};
                        if(item._balloonHook[key]) return false;
                        item._balloonHook[key] = res;
                    });
                } else {
                    if(!this._balloonHook) this._balloonHook = {};
                    if(this._balloonHook[key]) return false;
                    this._balloonHook[key] = res;
                }
                return true;
            });
			gmxAPI.extendFMO('removeBalloonHook', function(key) {
                if(this.filters) {
                    this.filters.forEach(function(item) {
                        if(item._balloonHook) delete item._balloonHook[key];
                    });
                } else {
                    if(this._balloonHook) delete this._balloonHook[key];
                }
            });
		}
	});
	//gmxAPI.BalloonClass = BalloonClass;
})();
