/*****************************************************************************
 ***
 *** KML Support 
 ***
 *****************************************************************************/


/*
  fillNode: creates a <Style> node to inject into a KML string.
  Parameters: (kml: string, fill: string)
    kml is a string parsed from kml.
    fill is a string representing a number that represents the 'fill' value of the generated style node. defaults to 0.
  Return: stylenode: KML Node
*/
const fillNode = (kml, fill) => {
    const styleNode = kml.createElement('Style');
    const polyStyleNode = kml.createElement('PolyStyle');
    const fillNode = kml.createElement('fill');
    fillNode.textContent = fill | '0';
    polyStyleNode.appendChild(fillNode);
    styleNode.appendChild(polyStyleNode);
    return styleNode;
  };

/*
  outlineKML: Injects a Style Node into supplied KML.
  Parameters: (KMLString: ol.format.KML)
  Return: ol.format.KML
  !! NOT PURE !!
  mutates supplied KML object
*/
export function  outlineKML (KMLString) {
    const Parser = new DOMParser();
    const Serializer = new XMLSerializer();
    const parsedKML = Parser.parseFromString(KMLString, "text/xml");
    const styleNode = fillNode(parsedKML, '0');
    parsedKML.getElementsByTagName("Placemark")[0].insertBefore(styleNode, parsedKML.getElementsByTagName("Placemark")[0].children[0]);
    return Serializer.serializeToString(parsedKML);
  };
