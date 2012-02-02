//Управление клиентской кластеризацией 
(function()
{
	var Clusters =	function(parent)		// атрибуты кластеризации потомков
	{
		this._parent = parent;
		var RenderStyle = {		// стили кластеров
			marker: { image: 'http://kosmosnimki.ru/poi2/cluster_img.png', center: true, minScale: 0.5, maxScale: 2, scale: '[Количество]/50' },
			label: { size: 12, align:'center', color: 0xff00ff, haloColor: 0xffffff, value:'[Метка]', field:'Количество' }
		};
		var HoverStyle = {		// стили кластеров при наведении
			marker: { image: 'http://kosmosnimki.ru/poi2/cluster_img_hover.png', center: true, minScale: 0.5, maxScale: 2, scale: '[Количество]/50' },
			label: { size: 12, align:'center', color: 0xff0000, haloColor: 0xffffff, value:'[Метка]', field:'Количество' }
		};

		this._attr = {
			'radius': 20,
			'iterationCount': 1,
			'newProperties': {						// Заполняемые поля properties кластеров
				'Количество': '[objectInCluster]'	// objectInCluster - количество обьектов попавших в кластер (по умолчанию 'Количество')
			},
			'RenderStyle': RenderStyle,				// стили кластеров
			'HoverStyle': HoverStyle,				// стили кластеров при наведении
			'clusterView': {},						// Атрибуты отображения членов кластера (при null не отображать)
			'visible': false
		};

		// Добавление прослушивателей событий
		gmxAPI._listeners.addMapStateListener(parent, 'reSetStyles', function(data)
			{
				var filter = data['filter'];
				var filterOld = data['filterOld'];
				if(filterOld && filterOld['clusters'] && 'setClusters' in filter) {	// Перенос атрибутов кластеризации в новый filter
					filter.setClusters(filterOld['clusters']['attr']);
				}
			}
		);
		
	};
	Clusters.prototype = {
		'_chkToFlash':	function() {
			if(this._attr.visible && this._parent) gmxAPI._cmdProxy('setClusters', { 'obj': this._parent, 'attr': this._attr });
		},
		'setProperties':function(prop) { var out = {}; for(key in prop) out[key] = prop[key]; this._attr.newProperties = out; this._chkToFlash(); },
		'getProperties':function() { var out = {}; for(key in this._attr.newProperties) out[key] = this._attr.newProperties[key]; return out; },
		'setStyle':		function(style, activeStyle) { this._attr.RenderStyle = style; this._attr.HoverStyle = (activeStyle ? activeStyle : style); this._chkToFlash(); },
		'getStyle':		function() { var out = {}; if(this._attr.RenderStyle) out.RenderStyle = this._attr.RenderStyle; if(this._attr.HoverStyle) out.HoverStyle = this._attr.HoverStyle; return out; },
		'setRadius':	function(radius) { this._attr.radius = radius; this._chkToFlash(); },
		'getRadius':	function() { return this._attr.radius; },
		'setIterationCount':	function(iterationCount) { this._attr.iterationCount = iterationCount; this._chkToFlash(); },
		'getIterationCount':	function() { return this._attr.iterationCount; },
		'getVisible':	function() { return this._attr.visible; },
		'setVisible':	function(flag) { this._attr.visible = (flag ? true : false); if(this._attr.visible) this._chkToFlash(); else gmxAPI._cmdProxy('delClusters', { 'obj': this._parent }); },
		'setClusterView':	function(hash) { this._attr.clusterView = hash; this._chkToFlash(); },
		'getClusterView':	function() { if(!this._attr.clusterView) return null; var out = {}; for(key in this._attr.clusterView) out[key] = this._attr.clusterView[key]; return out; }
	};

	//расширяем namespace
    gmxAPI._Clusters = Clusters;
	
	//расширяем FlashMapObject
	gmxAPI.extendFMO('setClusters', function(attr) { return gmxAPI._cmdProxy('setClusters', { 'obj': this, 'attr':attr }); });
	gmxAPI.extendFMO('delClusters', function(attr) { return gmxAPI._cmdProxy('delClusters', { 'obj': this }); });
})();