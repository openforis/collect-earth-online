export function encodeImageFileAsURL(file, callback){
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
}
