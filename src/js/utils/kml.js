const fillNode = (kml, fill) => {
    const styleNode = kml.createElement('Style');
    const polyStyleNode = kml.createElement('PolyStyle');
    const fillNode = kml.createElement('fill');
    fillNode.textContent = fill | '0';
    polyStyleNode.appendChild(fillNode);
    styleNode.appendChild(polyStyleNode);
    return styleNode;
  };
  
export function  outlineKML (KMLString) {
    const Parser = new DOMParser();
    const Serializer = new XMLSerializer();
    const parsedKML = Parser.parseFromString(KMLString, "text/xml");
    const styleNode = fillNode(parsedKML, '0');
    parsedKML.getElementsByTagName("Placemark")[0].insertBefore(styleNode, parsedKML.getElementsByTagName("Placemark")[0].children[0]);
    return Serializer.serializeToString(parsedKML);
  };
