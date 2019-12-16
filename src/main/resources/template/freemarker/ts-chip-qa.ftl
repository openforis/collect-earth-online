<!DOCTYPE html>
<html lan="en">
	<head>
		<title>Intra-Annual Chip Gallery</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="${root}/css/timesync_style.css">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
		<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>
    <script type="text/javascript" src="${root}/js/jquery.mousewheel.min.js"></script>
		<!--script src="imagesLoaded.js"></script>-->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.imagesloaded/3.2.0/imagesloaded.pkgd.min.js"></script>	
    <script>
        var userID = ${interpreter};
        var userName = "${username}";
        var authHeader = "authHeader";
       var tsDashMessage = undefined; //new URLSearchParams(window.location.search).keys().next().value;
    </script>
		<style>

		</style>
	</head>
	<body style="min-width:100%;">

		<div id="chipGallerySection" style="margin:5px;">
			<p id="pageTitle" class="header" style="display:inline-block"></p>
			<!--
			<div style="display:inline-block; float:right; padding-right:3px">
			-->
			<div style="text-align: center">
				<span id="prevYear" class="glyphicon glyphicon glyphicon-step-backward" style="cursor:pointer">Previous</span>
				<span id='currentYear' class="glyphicon" style="padding: 20px">This Year</span>
				<span id="nextYear" class="glyphicon glyphicon glyphicon-step-forward" style="cursor:pointer">Next</span>
			</div>
			
			<div id="chip-gallery" style="width:auto; height:auto; overflow-y:scroll"></div>
		</div>
		<div id="img-gallery"></div>
		<input id="selectedColor" autocomplete="off" type="color" name="selectedColor" value="#ED2939" style="display:none;">
		<ul class="dropdown-menu specPlot chipSetList" id="chipSetList" style="display:none;">
			<li id="chipSetBGW">TM TC</li>
			<li id="chipSet743">TM 7,4,3</li>
			<li id="chipSet432">TM 4,3,2</li>
		</ul>
		<script>
			
			///////////////////LISTENER AND HANDLER FOR PREVIOUS AND NEXT YEAR BUTTONS///////////////////
			$(".glyphicon").click(function(){
				if($(this).prop("id") == "prevYear"){					
					if((originChipIndex - 1) <= -1){
						return
					} else{
						originChipIndex -= 1;
					}		
				} else{
					if((originChipIndex + 1) >= yearList.length){
						return
					} else{
						originChipIndex += 1;
					}
				}
				year = yearList[originChipIndex];
				//$("#pageTitle").text("All Image Chips for "+year);
				$('#currentYear').text(year);
				var imageYear = $.grep(annualData, function(e){return e.image_year == year;});
				julday = imageYear[0].image_julday;
				getAndDrawChips();
			})
		
		
			///////////////////SEND MESSAGES TO THE ORIGIN WINDOW///////////////////	
			$("body").on("click",".chipImg.intraAnnual",function(){
					var canvasIDindex = $("canvas").index(this);
					$(".chipHolder").removeClass("selected");
					$(".chipHolder").eq(canvasIDindex).addClass("selected");				
					var newSyOffset = 0*255 //canvasIDindex    //calc the source x offset for that chip
					var	message = {
							"action":"replace_chip",
							"newSyOffset":newSyOffset, //tell the origin where to set the original offset for the chip
							"originChipIndex":originChipIndex, //tell the origin which chip to set the original offset for (index)
							"useThisChip":0, //canvasIDindex,//tell the origin what chip to use instead
							"src":{
								chipSet432:origData[canvasIDindex].url_432,
								chipSet743:origData[canvasIDindex].url_743,
								chipSetBGW:origData[canvasIDindex].url_tcb
							},//origData[canvasIDindex].url, //images[canvasIDindex],
							"data":data.Values[canvasIDindex]
							//"julday":juldays[canvasIDindex]
						};
					originURL.postMessage(JSON.stringify(message), '*'); //the 'originURL' object is just the url of the origin window saved when a messages was received from it	
			});

			
			///////////////////DEAL WITH THE CHIP HOVER AND ORIGIN WINDOW POINT HIGHLIGHT///////////////////
			$(document).on({
				mouseenter:function(){				
					var canvasIDindex = $("canvas").index(this);
					var message = {
						"action":"mouseEnter",
						"data":data.Values[canvasIDindex]
					}					
					originURL.postMessage(JSON.stringify(message), '*');				
				},
				mouseleave:function(){
					var canvasIDindex = $("canvas").index(this)
					var message = {
						"action":"mouseLeave",
						"data":data.Values[canvasIDindex]
					}					
					originURL.postMessage(JSON.stringify(message), '*');		
				}
			},".chipImg.intraAnnual");
			
						
			///////////////////FUNCTION TO GET CHIPS AND DATA FROM THE SERVER FOR A GIVEN YEAR AND DRAW THEM///////////////////
			function getAndDrawChips(){
				$("#chip-gallery").empty(); //reset
				$("#img-gallery").empty(); //reset
				juldays = []; //reset
				chipInfo = {useThisChip:[],canvasIDs:[],imgIDs:[],sxOrig:[],syOrig:[],sWidthOrig:[],sxZoom:[],syZoom:[],sWidthZoom:[],chipsInStrip:[],year:[],julday:[],src:[],sensor:[]}; //reset global

				//var url = 'https://timesync.forestry.oregonstate.edu/_ts3/data/'+initialDrawInfo.userID+'/'+initialDrawInfo.projectID+'/'+initialDrawInfo.tsa+'/'+initialDrawInfo.plotID+'/'+year //dataFromOrigin.year						
        var url = 'http://timesync.gis.usu.edu/_ts3/data/'+initialDrawInfo.userID+'/'+initialDrawInfo.projectID+'/'+initialDrawInfo.tsa+'/'+initialDrawInfo.plotID+'/'+year //dataFromOrigin.year						


				$.getJSON(url).done(function(returnedData){
					origData = returnedData; //reset global
					n_chips = origData.length; //reset global
					data = {"Values":[]}; //reset global
					for(var i=0;i<n_chips;i++){
						data.Values.push(parseSpectralData(origData,i));
						juldays.push(origData[i].image_julday); //reset global
					}
					data = calcIndices(data); //reset global
					data = calcDecDate(data); //reset global
					
					makeChipInfo("json", origData); //needs to be here if chips are individual files
					appendSrcImg();
					var thisIndex = [$.inArray(julday,juldays)] //figure out what date was shown in the main window so it can be highlighted		- [$.inArray(dataFromOrigin.julday,juldays)]					
					appendChips("intraAnnual",thisIndex);							
					
					//$(window).on("load",function(){
					//	makeChipInfo("json", origData);
					//	drawAllChips("intraAnnual");							
					//})
					
					$("#img-gallery").imagesLoaded(function(){						 
						//makeChipInfo("json", origData); doesn't need to be here unless the chips are packaged as strips
						// console.log('draw all chips')
						drawAllChips("intraAnnual");		
					}).done( function(instance){
						//console.log('all images successfully loaded');
					});						
				});
			}

						
			//////////////////////////SET GLOBAL VARIABLES/////////////////////////////////
			var originURL = ""; //need to save the url of the origin window - will get it once a message has been sent from it
			var originChipIndex = 0;
			var juldays = [];
			var year = 0;
			var julday = 0;
			var chipDisplayProps = {};
			// var dataFromOrigin = {};
			var initialDrawInfo = {};
			var annualData = [];
			var yearList = [];
			//var images = []; //not used when src is not a chip strip
			
			//////////////////////////GET MESSAGES FROM ORIGIN///////////////////////////////// 
			$(window).on("message onmessage",function(e){
				var dataFromOrigin = JSON.parse(e.originalEvent.data); //needs to be global
				// chipDisplayProps = dataFromOrigin.chipDisplayProps; //set global	

				if(dataFromOrigin.action != "change_chip_set"){
					chipDisplayProps = dataFromOrigin.chipDisplayProps; //set global				
				}
				$("#chipSetList li").removeClass("active")	
				$("#"+dataFromOrigin.thisChipSet).addClass("active")
				
				switch(dataFromOrigin.action){
					case "add_chips":
						initialDrawInfo = $.extend(true, {}, dataFromOrigin); //retain of copy of the initial drawing info from the main window
						originURL = e.originalEvent.source; //the 'e.originalEvent.source' is just the url of the origin window - save it for use later when we need to send messages to the origin window
						yearList = initialDrawInfo.yearList;
						originChipIndex = initialDrawInfo.chipIndex; //reset global
						year = initialDrawInfo.year;  //needed for chipInfo object
						
						$.getJSON('https://timesync.forestry.oregonstate.edu/_ts3/data/'+initialDrawInfo.userID+'/'+initialDrawInfo.projectID+'/'+initialDrawInfo.tsa+'/'+initialDrawInfo.plotID).done(function(returnedData){
							annualData = returnedData;
							var imageYear = $.grep(annualData, function(e){return e.image_year == year;});
							julday = imageYear[0].image_julday;
																			
							//$("#pageTitle").text("All Image Chips for "+year); //set the page title with the year
							$('#currentYear').text(year);
							$("#selectedColor").prop(initialDrawInfo.selectedColor);
							
							$(document).ready(function(){
								getAndDrawChips();
							});
						});
					break;
					case "change_chip_set":
						// console.log("change_chips")
						// console.log($("#chipSetList .active").attr("id"))
						getAndDrawChips();
					break

					case "zoom":
						drawAllChips("intraAnnual");
					break;
					case "chipSize":
						var selectThis = [$(".chipHolder.selected").index()];
						$(".chipHolder").remove();
						appendChips("intraAnnual", selectThis);
						drawAllChips("intraAnnual");
					break;
					case "plotSize":
						updateChipInfo();
						drawAllChips("intraAnnual");	
					break;
					case "clearChips":
						$("#pageTitle").text("");
						$("#chip-gallery").empty(); //reset
						$("#img-gallery").empty(); //reset
					break;
				}
				//$("#message").append(e.originalEvent.data); //****need to use 'originalEvent' instead of 'event' since im using jquery to bind the event. the jquery event object is different from the javascript event object - originalEvent is a copied version of the original javascript event object
			});	

		</script>
		<script type="text/javascript" src="${root}/js/ts_specIndexStretch.js"></script>
		<script type="text/javascript" src="${root}/js/ts_scripts.js"></script>
	</body>
</html>