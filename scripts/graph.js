var chartVars = "KoolOnLoadCallFunction=chartReadyHandler";

KoolChart.create("chart1", "chartHolder", chartVars, "100%", "45%");

function chartReadyHandler(id) {
  document.getElementById(id).setLayout(layoutStr);
  document.getElementById(id).setData(chartData);
}

var layoutStr =
  '<KoolChart backgroundColor="#FFFFFF"  borderStyle="none">'
   +'<Options>'
    +'<Caption text="Monitor Blood Pressure"/>'
    +'<SubCaption text="unit: mmHg"/>'
   +'</Options>'
   +'<DateFormatter id="dateFmt" formatString="HH:NN:SS"/>'
   +'<NumberFormatter id="numFmt"/>'
   +'<RealTimeChart id="chart" dataDisplayType="time" timePeriod="300" interval="3" showDataTips="true">'
    +'<horizontalAxis>'
     +'<DateTimeAxis dataUnits="seconds" labelUnits="seconds" dataInterval="5" interval="9" formatter="{dateFmt}" displayLocalTime="true" />'
    +'</horizontalAxis>'
    +'<verticalAxis>'
     +'<LinearAxis id="vAxis" minimum="0" maximum="160" formatter="{numFmt}"/>'
    +'</verticalAxis>'
    +'<series>'
     +'<Line2DSeries xField="Time" yField="Data" displayName="Process 1" htmlJsFunction="userFunction" itemRenderer="CircleItemRenderer">'
      +'<lineStroke>'
       +'<Stroke color="#999999" weight="2"/>'
      +'</lineStroke>'
     +'</Line2DSeries>'
    +'</series>'
    +'<backgroundElements>'
     +'<AxisMarker>'
      +'<lines>'
       +'<AxisLine fontWeight="bold" color="#f49732" label="High Blood Pressure" labelAlign="left" value="140" labelYOffset="-10">'
        +'<stroke>'
         +'<Stroke color="#cccccc"/>'
        +'</stroke>'
       +'</AxisLine>'
       +'<AxisLine fontWeight="bold" color="#5587a2" label="Low Blood Pressure" labelAlign="left" labelUpDown="down" labelYOffset="10" value="60">'
        +'<stroke>'
         +'<Stroke color="#cccccc"/>'
        +'</stroke>'
       +'</AxisLine>'
      +'</lines>'
      +'<ranges>'
       +'<AxisRange startValue="60" endValue="140">'
        +'<fill>'
         +'<SolidColor color="#eeeeee" alpha="0.4"/>'
        +'</fill>'
       +'</AxisRange>'
      +'</ranges>'
     +'</AxisMarker>'
    +'</backgroundElements>'
   +'</RealTimeChart>'
   +'<HttpServiceRepeater url="https://www.koolchart.com/realtimeSample/process2Data.php" target="{chart}" interval="2" method="get"/>'
  +'</KoolChart>';

function userFunction(id, index, data, values){
  var className = "high",
   value = values[1];

  if(value < 60 || value > 140){
   if(value < 60)
    className = "low";

   return {
    content : "",
    className : "odd_pressure " + className + "_blood_pressure",
    events : {
     "click" : (function(a){
      return function(event){
       event.target.parentNode.removeChild(event.target);
       alert("Time: " + a.Time + "Blood Pressure: " + a.Data);
      };
     })(data)
    }
   };
  }
  return;
 }
