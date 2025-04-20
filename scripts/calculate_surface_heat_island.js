var table = ee.FeatureCollection("users/XXXXXXXXXXX/IND");
var style = require('users/gena/packages:style')

var delhiGeometry = ee.FeatureCollection(table).filter(ee.Filter.eq('NAME_2', 'Delhi')).geometry()
var dataset = ee.ImageCollection('MODIS/061/MOD11A1')
                  .filter(ee.Filter.date('2009-10-01', '2009-12-30'));
var datasetLandcoverModis = ee.Image('MODIS/061/MCD12Q1/2009_01_01').clip(delhiGeometry);
var igbpLandCover = datasetLandcoverModis.select('LC_Type1');
var cropland = igbpLandCover.eq(12); // Cropland class is labeled as 40

var igbpLandCoverVis = {
  min: 1.0,
  max: 17.0,
  palette: [
    '05450a', '086a10', '54a708', '78d203', '009900', 'c6b044', 'dcd159',
    'dade48', 'fbff13', 'b6ff05', '27ff87', 'c24f44', 'a5a5a5', 'ff6d4c',
    '69fff8', 'f9ffa4', '1c0dff'
  ],
};

// Function to convert LST from Kelvin to Celsius
function kelvinToCelsius(image) {
  // Define the scaling factor for LST conversion
  var scalingFactor = 0.02;
  
  // Select thermal bands and apply scaling to convert to Kelvin
  var thermalBands = image.select('LST_*.*').multiply(scalingFactor);
  
  // Convert Kelvin to Celsius
  var thermalBandsCelsius = thermalBands.subtract(273.15);
  
  // Add the Celsius bands to the image
  return image.addBands(thermalBandsCelsius, null, true).clip(delhiGeometry);
}

dataset = dataset.map(kelvinToCelsius);
var lstNight = dataset.select('LST_Night_1km').mean().clip(delhiGeometry);

var palette = [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003'
  ]

var landSurfaceTemperatureVis = {
  min: 15,
  max: 45,
  palette: palette,
};

var landSurfaceTemperatureDiffVis = {
  min: -5,
  max: 5,
  palette: palette,
};


var meanLST = dataset.select('LST_Night_1km').mean().clip(delhiGeometry)
var croplandLST = meanLST.updateMask(cropland);

var croplandLSTMean = croplandLST.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: delhi_geometry,
  scale: 1000, // Adjust scale as needed
  maxPixels: 1e13
});

var meanLSTValue = croplandLSTMean.get('LST_Night_1km');
var uhi = lst_night.subtract(ee.Image.constant(meanLSTValue))
print('Mean LST over Cropland (Celsius):', meanLSTValue);

Map.addLayer(igbpLandCover.clip(delhi_geometry), igbpLandCoverVis, 'IGBP Land Cover');
Map.addLayer(
    uhi, landSurfaceTemperatureDiffVis,
    'Urban - Rural Mean');

Map.addLayer(
    lst_night, landSurfaceTemperatureVis,
    'Land Surface Temperature Night');

Map.addLayer(aqGeometry.style({'width': 4,'fillColor': '#FF000000', 'color': 'white'}), {}, 'Delhi Air Quality Sensor');

// LST Night Legend
var legend = ui.Panel({
style: {
position: 'bottom-left',
padding: '8px 15px'
}
});
 
function addLegend() {
  // LST Night Urban - Rural Diff
  var legend = ui.Panel({
  style: {
  position: 'bottom-right',
  padding: '8px 15px'
  }
  });

  // Create legend title
  var legendTitle = ui.Label({
  value: 'Urban - Rural LST Diff (°C)',
  style: {
  fontWeight: 'bold',
  fontSize: '18px',
  margin: '0 0 4px 0',
  padding: '0'
  }
  });
  
  // Add the title to the panel
  legend.add(legendTitle);
   
  // create the legend image
  var lon = ee.Image.pixelLonLat().select('latitude');
  var gradient = lon.multiply((landSurfaceTemperatureDiffVis.max-landSurfaceTemperatureDiffVis.min)/100.0).add(landSurfaceTemperatureDiffVis.min);
  
  var legendImage = gradient.visualize(landSurfaceTemperatureDiffVis);
  
  // create text on top of legend
  var panel_max = ui.Panel({
  widgets: [
  ui.Label(landSurfaceTemperatureDiffVis['max'])
  ],
  });
   
  legend.add(panel_max);
   
  // create thumbnail from the image
  var thumbnail = ui.Thumbnail({
  image: legendImage,
  params: {bbox:'0,0,10,100', dimensions:'10x200'},
  style: {padding: '1px', position: 'bottom-center'}
  });
   
  // add the thumbnail to the legend
  legend.add(thumbnail);
   
  // create text on top of legend
  var panel_min = ui.Panel({
  widgets: [
  ui.Label(landSurfaceTemperatureDiffVis['min'])
  ],
  });
   
  legend.add(panel_min);
  
  Map.add(legend);
  
} 
addLegend()
Map.add(legend);

style.SetMapStyleGrey()

// Export UHI Layer as GeoTIFF
Export.image.toDrive({
  image: uhi,
  description: 'UHI_2010',
  scale: 1000,
  region: delhi_geometry,
  fileFormat: 'GeoTIFF'
});
