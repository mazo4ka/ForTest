import flash.display.Sprite;
import flash.display.DisplayObject;
import flash.display.Loader;
import flash.display.BitmapData;
import flash.display.Stage;
import flash.geom.Point;

import flash.events.Event;
import flash.events.IOErrorEvent;
import flash.net.URLRequest;
import flash.system.LoaderContext;
import flash.system.ApplicationDomain;
import flash.errors.Error;
import flash.utils.Timer;
import flash.events.TimerEvent;

typedef Req = {
	var url : String;
	var onLoad :BitmapData->Void;
	var noCache:Bool;
}

class Utils
{
	public static var worldWidth:Float = 20037508;
	public static var worldDelta:Float = 1627508;
	static var nextId:Int = 0;
	static var bitmapDataCache:Hash<BitmapData> = new Hash<BitmapData>();
	
	static var loaderDataCache:Array<Req> = [];				// Очередь загрузки Bitmap-ов
	static var loaderActive:Bool = false;					// Флаг активности Loader Bitmap-ов
	static var loaderCache:Hash<Bool> = new Hash<Bool>();	// Файлы в процессе загрузки
	
	public static function getNextId()
	{
		nextId += 1;
		return "id" + nextId;
	}

	public static function addSprite(parent:Sprite)
	{
		var child = new Sprite();
		parent.addChild(child);
		return child;
	}

	public static function getScale(z:Float)
	{
		return Math.pow(2, -z)*156543.033928041;
	}

	public static function getDateProperty(properties:Hash<String>)
	{
		var date = properties.get("date");
		if (date == null)
			date = properties.get("DATE");
		return date;
	}

	public static function loadImage(url:String, onLoad:DisplayObject->Void, ?onError:Void->Void)
	{
		var loader = new Loader();
		var callOnError = function()
		{
			if (onError != null)
				onError();
		}
		var timer = new Timer(60000, 1);
		timer.addEventListener("timer", function(e:TimerEvent)
		{
			try { loader.close(); } catch (e:Error) {}
			callOnError();
		});
		timer.start();

		loader.contentLoaderInfo.addEventListener(Event.INIT, function(event) 
		{ 
			timer.stop();
			onLoad(loader);
			Main.bumpFrameRate();
		});
		loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, function(event)
		{
			timer.stop();
			callOnError();
		});
		var loaderContext:LoaderContext = new LoaderContext();
		loaderContext.checkPolicyFile = true;
		try 
		{
			loader.load(new URLRequest(url), loaderContext);
		}
		catch (e:Error) 
		{
			trace("security error while loading " + url);
			timer.stop();
			callOnError();
		}
	}

	// Загрузить BitmapData по url или взять из Cache
	public static function loadBitmapData(url:String, onLoad:BitmapData->Void, ?noCache_:Bool)
	{
		var req:Req = { url: url, onLoad: onLoad, noCache: false };
		if(noCache_ == true) req.noCache = true;
		if (bitmapDataCache.exists(url))
		{
			onLoad(Utils.bitmapDataCache.get(url));
		} else if(loaderCache.exists(url))
		{
			loaderCache.set(url, true);
			loaderDataCache.push(req);
		} else
		{
			loaderCache.set(url, true);
			runLoadImage(req);
		}
		chkLoadImage();
	}

	// Проверка очереди загрузки BitmapData
	private static function chkLoadImage()
	{
		if (loaderActive || loaderDataCache.length == 0) return;
		var req:Req = loaderDataCache.shift();
		runLoadImage(req);
	}

	// Загрузка BitmapData
	private static function runLoadImage(req:Req)
	{
		var url:String = req.url;
		var onLoad = req.onLoad;
		var noCache:Bool = req.noCache;

		if (bitmapDataCache.exists(url))
		{
			onLoad(Utils.bitmapDataCache.get(url));
			chkLoadImage();
		} else {
			var addToCache = function(bitmapData:BitmapData)
			{
				Utils.bitmapDataCache.set(url, bitmapData);
				onLoad(Utils.bitmapDataCache.get(url));
			}

			var loader:Loader = new Loader();
			var complete = function(e)
			{ 
					var bitmapData:BitmapData = new BitmapData(Std.int(loader.width), Std.int(loader.height), true, 0);
					bitmapData.draw(loader);
					if (noCache ) onLoad(bitmapData);
					else addToCache(bitmapData);
					loaderActive = false;
					loaderCache.remove(url);
					chkLoadImage();
			}
			loader.contentLoaderInfo.addEventListener(Event.COMPLETE, complete);

			var err = function(e)
			{
				loaderActive = false;
				chkLoadImage();
			}
			loaderActive = true;
			loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, err);
			var loaderContext:LoaderContext = new LoaderContext(true, ApplicationDomain.currentDomain);
			loader.load(new URLRequest(url), loaderContext);
		}
	}
	
	public static function parseGeometry(geometry_:Dynamic, ?tileExtent:Extent):Geometry
	{
		var type:String = geometry_.type;
		if (type == "POINT")
		{
			var c:Array<Float> = parseFloatArray(geometry_.coordinates);
			return new PointGeometry(c[0], c[1]);
		}
		else if (type == "LINESTRING")
		{
			return new LineGeometry(parseFloatArray(geometry_.coordinates));
		}
		else if (type == "POLYGON")
		{
			var coords = new Array<Array<Float>>();
			for (part_ in cast(geometry_.coordinates, Array<Dynamic>))
				coords.push(parseFloatArray(part_));
			return new PolygonGeometry(coords, tileExtent);
		}
		else if (type.indexOf("MULTI") != -1)
		{
			var subtype = type.split("MULTI").join("");
			var ret = new MultiGeometry();
			for (subcoords in cast(geometry_.coordinates, Array<Dynamic>))
				ret.addMember(parseGeometry({ type: subtype, coordinates: subcoords }, tileExtent));
			return ret;
		}
		else
		{
			//trace("Unrecognized geometry type: " + type);
			//throw new Error("Cannot parse geometry");
			return new Geometry();
		}
	}

	static function parseFloatArray(coords_:Dynamic):Array<Float>
	{
		var arr:Array<Dynamic> = cast(coords_, Array<Dynamic>);
		if (Std.is(arr[0], Array))
		{
			var ret = new Array<Float>();
			for (point_ in arr)
			{
				ret.push(point_[0]);
				ret.push(point_[1]);
			}
			return ret;
		}
		else
			return coords_;
	}

	// Получить группы точек по прямоугольной сетке
	public static function getClusters(attr:Dynamic, geom:MultiGeometry, tile:VectorTile, currentZ:Int, ?identityField:String):MultiGeometry
	{
		var traceTime = flash.Lib.getTimer();
		
		var iterCount:Int = (attr.iterationCount != null ? attr.iterationCount : 1);	// количество итераций K-means
		var radius:Int = (attr.radius != null ? attr.radius : 20);						// радиус кластеризации в пикселах

		var propFields:Dynamic = (attr.propFields != null ? attr.propFields : { } );
		var objectInCluster:String = (propFields.objectInCluster != null ? propFields.objectInCluster : '_count');	// количество обьектов попавших в кластер
		var labelField:String = (propFields.labelField != null ? propFields.labelField : '_label');	// Поле для label.field
		var scaleForMarker:String = (propFields.scaleForMarker != null ? propFields.scaleForMarker : '_scale');	// поле scale для стиля маркера

		var tileExtent:Extent = tile.extent;			// Extent тайла

		var scale:Float = Utils.getScale(currentZ);		// размер пиксела в метрах меркатора
		var radMercator:Float = radius * scale;			// размер радиуса кластеризации в метрах меркатора
		
		if(identityField == null) identityField = 'ogc_fid';
		var grpHash = new Hash<Dynamic>();
		for (i in 0...Std.int(geom.members.length))
		{
			if (!Std.is(geom.members[i], PointGeometry)) continue;
			var member:PointGeometry = cast(geom.members[i], PointGeometry);
			var dx:Int = cast((member.x - tileExtent.minx) / radMercator);		// Координаты квадранта разбивки тайла
			var dy:Int = cast((member.y - tileExtent.miny) / radMercator);
			var key:String = dx + '_' + dy;
			var ph:Dynamic = (grpHash.exists(key) ? grpHash.get(key) : {});
			var arr:Array<Int> = (ph.arr != null ? ph.arr : new Array<Int>());
			arr.push(i);
			ph.arr = arr;
			grpHash.set(key, ph);
		}
		
		var centersGeometry = new MultiGeometry();
		var objIndexes:Array<Array<Int>> =  [];
		
		function setProperties(prop_:Hash<String>, len_:Int):Void
		{
			var _count:String = (len_ > 99 ? '*' : (len_ < 10 ? '' : cast(len_)));
			prop_.set(labelField, _count);
			var _scale:String = (len_ > 99 ? '1' : (len_ < 10 ? '0.5' : cast(0.5+Math.sqrt((len_ - 10)/90)) ));
			prop_.set(scaleForMarker, _scale);
			prop_.set(objectInCluster, cast(len_));
		}
		
		function getCenterGeometry(arr:Array<Int>):PointGeometry
		{
			if (arr.length < 1) return null;
			var xx:Float = 0; var yy:Float = 0;
			for (j in arr)
			{
				var memberSource:PointGeometry = cast(geom.members[j], PointGeometry);
				xx += memberSource.x;
				yy += memberSource.y;
			}
			xx /= arr.length;
			yy /= arr.length;
			return new PointGeometry(xx, yy);
		}
		
		// преобразование grpHash в массив центроидов и MultiGeometry
		for (key in grpHash.keys())
		{
			var ph:Dynamic = grpHash.get(key);
			if (ph == null || ph.arr.length < 1) continue;
			objIndexes.push(ph.arr);
			var pt:PointGeometry = getCenterGeometry(ph.arr);
			var prop:Hash<String> = new Hash<String>();
			if (ph.arr.length == 1) {
				var propOrig = geom.members[ph.arr[0]].properties;
				for(key in propOrig.keys()) prop.set(key, propOrig.get(key));
			}
			else
			{
				prop.set(identityField, 'cl_' + getNextId());
			}
			setProperties(prop, ph.arr.length);
			
			pt.properties = prop;
			centersGeometry.addMember(pt);
		}

		// find the nearest group
		function findGroup(point:Point):Int {
			var min:Float = Geometry.MAX_DISTANCE;
			var group:Int = -1;
			for (i in 0...Std.int(centersGeometry.members.length))
			{
				var member = centersGeometry.members[i];
				var pt:PointGeometry = cast(member, PointGeometry);
				var center:Point = new Point(pt.x, pt.y);
				var d:Float = Point.distance(point ,center);
				if(d < min){
					min = d;
					group = i;
				}
			}
			return group;
		}
		
		// Итерация K-means
		function kmeansGroups():Void
		{
			var newObjIndexes:Array<Array<Int>> =  [];
			for (i in 0...Std.int(geom.members.length))
			{
				if (!Std.is(geom.members[i], PointGeometry)) continue;
				var member:PointGeometry = cast(geom.members[i], PointGeometry);

				var group:Int = findGroup(new Point(member.x, member.y));
				
				if (newObjIndexes[group] == null) newObjIndexes[group] = [];
				newObjIndexes[group].push(i);
			}
			centersGeometry = new MultiGeometry();
			objIndexes =  [];
			for (arr in newObjIndexes)
			{
				if(arr == null) continue;				
				var xx:Float = 0; var yy:Float = 0;
				for (j in arr)
				{
					var memberSource:PointGeometry = cast(geom.members[j], PointGeometry);
					xx += memberSource.x;
					yy += memberSource.y;
				}
				xx /= arr.length;
				yy /= arr.length;
				var pt:PointGeometry = new PointGeometry(xx, yy);

				var prop:Hash<String> = new Hash<String>();
				if (arr.length == 1) {
					var propOrig = geom.members[arr[0]].properties;
					for(key in propOrig.keys()) prop.set(key, propOrig.get(key));
				}
				else
				{
					prop.set(identityField, 'cl_' + getNextId());
				}
				setProperties(prop, arr.length);
				pt.properties = prop;
				
				centersGeometry.addMember(pt);
				objIndexes.push(arr);
			}
		}
		
		for (i in 0...Std.int(iterCount))	// Итерации K-means
		{
			kmeansGroups();
		}
		
		if(attr.debug != null) {
			var out = '';
			out += ' iterCount: ' + iterCount;
			out += ' objCount: ' + geom.members.length;
			out += ' clustersCount: ' + centersGeometry.members.length;
			out += ' time: ' + (flash.Lib.getTimer() - traceTime) + ' мсек.';
			trace(out);
		}
		return centersGeometry;
		
	}
	
}