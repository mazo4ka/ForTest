import flash.events.Event;

class VectorLayer extends MapContent
{	
	public var tileFunction:Int->Int->Int->Dynamic;
	public var identityField:String;
	public var tiles:Array<VectorTile>;
	public var geometries:Hash<Geometry>;

	public var hoverPainter:GeometryPainter;
	public var lastId:String;
	public var currentId:String;
	public var currentFilter:VectorLayerFilter;
	//var hoverTileExtent:Extent;
	//var hoverTiles:Array<VectorTile>;

	var flipCounts:Hash<Int>;
	var lastFlipCount:Int;
	var flipDown:Bool;

	public override function createContentSprite()
	{
		return Utils.addSprite(mapNode.vectorSprite);
	}

	public function new(identityField_:String, tileFunction_:Int->Int->Int->Dynamic)
	{
		identityField = identityField_;
		tileFunction = tileFunction_;
		flush();
	}

	public function flush()
	{
		tiles = new Array<VectorTile>();
		geometries = new Hash<Geometry>();
		flipCounts = new Hash<Int>();
		lastFlipCount = 0;
		if (mapNode != null)
			for (child in mapNode.children)
				if (Std.is(child.content, VectorLayerFilter))
					cast(child.content, VectorLayerFilter).flush();
	}

	public function addTile(i:Int, j:Int, z:Int)
	{
		tiles.push(new VectorTile(this, i, j, z));
	}

	public function createLoader(func:VectorTile->Int->Void)
	{
		var loaded = new Array<Bool>();
		for (tile in tiles)
			loaded.push(false);
		var nRemaining = 0;
		var me = this;
		var w = 2*Utils.worldWidth;
		return function(e1:Extent)
		{
			var tilesToLoad = new Array<VectorTile>();
			for (i in 0...me.tiles.length)
			{
				if (loaded[i])
					continue;

				var tile = me.tiles[i];
				var e2 = tile.extent;
				if ((e1.miny < e2.maxy) && (e2.miny < e1.maxy) && (
					((e1.minx < e2.maxx) && (e2.minx < e1.maxx)) || 
					((e1.minx < e2.maxx + w) && (e2.minx + w < e1.maxx)) || 
					((e1.minx < e2.maxx - w) && (e2.minx - w < e1.maxx))
				))
				{
					loaded[i] = true;
					nRemaining += 1;
					tilesToLoad.push(tile);
				}
			}
			for (tile in tilesToLoad)
			{
				tile.load(function()
				{
					nRemaining -= 1;
					func(tile, nRemaining);
				});
			}
		}
	}

	public function getStat()
	{
		var out:Dynamic = { };
		out.tilesCnt = tiles.length;
		out.pointsCnt = 0;
		for (tile in tiles)
		{
			if (tile.ids != null) out.pointsCnt += tile.ids.length;
		}
		return out;
	}

	public function repaintIndicator()
	{
		var distance:Float = Geometry.MAX_DISTANCE;
		var x = contentSprite.mouseX;
		var y = contentSprite.mouseY;
		var w = Utils.worldWidth;
		while (x > w)
			x -= 2*w;
		while (x < -w)
			x += 2*w;

		var newCurrentId:String = null;
		var newCurrentFilter:VectorLayerFilter = null;
		var zeroDistanceIds = new Array<String>();
		var zeroDistanceFilters = new Array<VectorLayerFilter>();
		//hoverTiles = new Array<VectorTile>();

		var pointSize = 15*Math.abs(mapNode.window.scaleY);
		var pointExtent = new Extent();
		pointExtent.update(x - pointSize, y - pointSize);
		pointExtent.update(x + pointSize, y + pointSize);

		for (tile in tiles)			// Просмотр содержимого тайлов под мышкой
		{
			if (!tile.finishedLoading) continue;
			if ((tile.ids != null) && tile.extent.overlaps(pointExtent))
			{
				for (i in 0...tile.ids.length)
				{
					var d = tile.geometries[i].distanceTo(x, y);
					if (d <= distance)
					{
						var id = tile.ids[i];
						for (node in mapNode.children)
						{
							if (node.vectorSprite.visible && Std.is(node.content, VectorLayerFilter))
							{
								var filter = cast(node.content, VectorLayerFilter);
								if (filter.ids.exists(id))
								{
									newCurrentId = id;
									newCurrentFilter = filter;
									//hoverTiles.push(tile);
									distance = d;
									if (d == 0)
									{
										zeroDistanceIds.push(id);
										zeroDistanceFilters.push(filter);
									}
								}
							}
						}
					}
				}
			}
		}
		
		var len = zeroDistanceIds.length;
		flipDown = (len > 1);
		if (len > 0)
		{
			var lastFc:Null<Int> = 100000000;
			var lastDate = "1900-00-00";
			for (i in 0...zeroDistanceIds.length)
			{
				var id = zeroDistanceIds[i];
				var fc:Null<Int> = flipCounts.get(id);
				var date = Utils.getDateProperty(geometries.get(id).properties);
				var isHigher:Bool = false;
				var isHigherDate = (date == null) || (date > lastDate);
				if (lastFc == null)
					isHigher = (fc == null) ? isHigherDate : (fc < 0);
				else if (lastFc > 0)
					isHigher = (fc == null) || (fc < lastFc);
				else if (lastFc < 0)
					isHigher = (fc != null) && (fc < lastFc);
				if (isHigher)
				{
					lastFc = fc;
					lastDate = date;
					newCurrentId = id;
					newCurrentFilter = zeroDistanceFilters[i];
				}
			}
		}
		if (newCurrentId != currentId)
		{
			if ((newCurrentFilter != currentFilter) && (currentFilter != null))
				currentFilter.mapNode.callHandler("onMouseOut");
			currentId = newCurrentId;
			if (currentId != null)
				lastId = currentId;
			if (newCurrentFilter != null)
				newCurrentFilter.mapNode.callHandler("onMouseOver");
			currentFilter = newCurrentFilter;

			//hoverTileExtent = new Extent();
			var hoverStyle = (currentFilter != null) ? currentFilter.mapNode.getHoveredStyle() : null;
			var hoverGeom = null;
			if (distance != Geometry.MAX_DISTANCE) {
				hoverGeom = geometries.get(currentId);
				if (hoverStyle != null && hoverStyle.fill != null) {	// Пока только для обьектов с заливкой
					hoverGeom = fromTileGeometry(hoverGeom);
				}
			}

			hoverPainter.geometry = hoverGeom;
			hoverPainter.repaint(hoverStyle);
		}
		if (currentFilter != null)
			currentFilter.mapNode.callHandler("onMouseMove");
	}

/*	
	// Проверка принадлежнсти точки границам тайлов
	private function onTileBoundary(x:Float, y:Float):Bool
	{
		var minx:Float;
		var miny:Float;
		var maxx:Float;
		var maxy:Float;

		for (tile in hoverTiles) {
			var d = (tile.extent.maxx - tile.extent.minx)/10000;
			minx = tile.extent.minx + d;
			miny = tile.extent.miny + d;
			maxx = tile.extent.maxx - d;
			maxy = tile.extent.maxy - d;
			if (x >= minx && x <= maxx && y >= miny && y <= maxy) return true;
		}
		return false;
	}
*/
	// Преобразование геометрии обьекта полученного из тайла
	private function fromTileGeometry(geom:Geometry):Geometry
	{
		if (Std.is(geom, PointGeometry)) {
			return geom;
		} else if (Std.is(geom, LineGeometry)) {
			return geom;
		} else if (Std.is(geom, PolygonGeometry)) {
			var geo = cast(geom, PolygonGeometry);
			var coords = new Array<Array<Float>>();
			var deltaX:Float = 0;

			var w = 2*Utils.worldWidth;
			var e1 = mapNode.window.visibleExtent;
			var cx1 = (e1.minx + e1.maxx) / 2;
			var e2 = geo.extent;
			var cx2 = (e2.minx + e2.maxx)/2;
			var d1 = Math.abs(cx2 - cx1 - w);
			var d2 = Math.abs(cx2 - cx1);
			var d3 = Math.abs(cx2 - cx1 + w);
			if ((d1 <= d2) && (d1 <= d3))
				deltaX = -w;
			else if ((d2 <= d1) && (d2 <= d3))
				deltaX = 0;
			else if ((d3 <= d1) && (d3 <= d2))
				deltaX = w;
			
			for (part in geo.coordinates) {
				var pp = new Array<Float>();
				//var flag = false;
				for (i in 0...Std.int(part.length/2)) {
					//var curFlag = onTileBoundary(part[i * 2], part[i * 2 + 1]);
					//if (!flag && !curFlag) {
						pp.push(part[i*2] + deltaX);
						pp.push(part[i * 2 + 1]);
					//}
					//flag = curFlag;
				}
				coords.push(pp);
			}
			
			geo = new PolygonGeometry(coords);
			return geo;
		} else if (Std.is(geom, MultiGeometry)) {
			var ret = new MultiGeometry();
			var geo = cast(geom, MultiGeometry);
			for (member in geo.members)
				ret.addMember(fromTileGeometry(member));
			return ret;
		}
		return null;
	}
	
	public override function addHandlers()
	{
		hoverPainter = new GeometryPainter(null, Utils.addSprite(contentSprite), mapNode.window);
	}

	public function flip():Int
	{
		lastFlipCount += 1;
		var ret = flipDown ? lastFlipCount : -lastFlipCount;
		if (currentId != null)
		{
			flipCounts.set(currentId, ret);
			repaintIndicator();
		}
		return ret;
	}
}
