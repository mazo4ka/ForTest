var nsGmx = nsGmx || {};

(function($){

/** Фильтрует объекты внутри векторных слоёв по интервалу дат
* @class
*/
var FiltersControl = function()
{
	var _layers = [];
	var _dateAttribute = null;
	var _dateBegin = null;
	var _dateEnd = null;
	var _type = null;
	
	var _setFilters = function()
	{
		var filterLayer = function(layer)
		{
			var	properties = layer.properties;
			
			var filterString = "`" + _dateAttribute + "` >= '" + $.datepicker.formatDate("yy-mm-dd", _dateBegin) + "'" + " AND " + "`" + _dateAttribute + "` <= '" + $.datepicker.formatDate("yy-mm-dd", _dateEnd) + "'",
				filters = layer.filters;
			
			for (var j = 0; j < filters.length; j++)
			{
				var lastFilter = properties.styles[j].Filter;
				
				filters[j].setFilter((lastFilter && lastFilter != "") ? ("(" + lastFilter + ") AND" + filterString) : filterString);
			}			
		}
		
		if (_type)
		{ //фильтруем все слои данного типа 
			for (var i = 0; i < globalFlashMap.layers.length; ++i)
				if (globalFlashMap.layers[i].properties.type === _type)
					filterLayer(globalFlashMap.layers[i]);
		}
		else
		{ //фильтруем конкретные слои
			for (var i = 0; i < _layers.length; ++i)
			{
				var name = _layers[i],
					layer = globalFlashMap.layers[name];
				
				if (!layer)
					continue;
					
				filterLayer(layer);
			}
		}
	}

	/**
	* @function 
	* @param {Array or string} layers Вектор имён слоёв для фильтрации или тип слоёв для фильтрации (Raster или Vector). В последнем случае фильтруются все слои данного типа
	* @param {string} dateAttribute Имя аттрибута даты в слоях
	*/
	this.init = function(layers, dateAttribute, calendar)
	{
		if (typeof layers === 'string')
			_type = layers;
		else
			_layers = layers;
		
		_dateAttribute = dateAttribute;
		
		var updateDate = function()
		{
			_dateBegin = calendar.getDateBegin();
			_dateEnd = calendar.getDateEnd();
		
			_setFilters();
		}
		
		$(calendar).change(updateDate);
		updateDate();
	}
	
	if (typeof _queryExternalMaps !== 'undefined')
		$(_queryExternalMaps).bind('map_loaded', _setFilters);
}

if ( typeof gmxCore !== 'undefined' )
{
	gmxCore.addModule('FiltersControl', {
		FiltersControl: FiltersControl
	});
}

nsGmx.FiltersControl = FiltersControl;

})(jQuery);