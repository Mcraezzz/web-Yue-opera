#target photoshop
app.displayDialogs = DialogModes.NO;

var templateFile = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_input/template.psd");
var logoFile = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_output/photoshop_assets/cuc_logo_replacement.png");
var overlayFile = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_output/photoshop_assets/yueyun_qingyin_content_overlay.png");
var outPsd = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_output/越韵清音易拉宝-PS重制.psd");
var outPng = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_output/越韵清音易拉宝-PS重制.png");
var outJpg = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_output/越韵清音易拉宝-PS重制.jpg");
var outPdf = new File("C:/Users/22672/xwechat_files/wxid_3o2ak0qx45x822_af6f/msg/file/2026-04/web-yueju(2)/design_output/越韵清音易拉宝-PS重制.pdf");

function hideLayerByName(container, targetName) {
    for (var i = 0; i < container.layers.length; i++) {
        var layer = container.layers[i];
        if (layer.name == targetName) {
            layer.visible = false;
        }
        if (layer.typename == "LayerSet") {
            hideLayerByName(layer, targetName);
        }
    }
}

function placeFile(fileObj, layerName, left, top) {
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), fileObj);
    desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
    executeAction(charIDToTypeID("Plc "), desc, DialogModes.NO);
    var layer = app.activeDocument.activeLayer;
    layer.name = layerName;
    var b = layer.bounds;
    var currentLeft = b[0].value;
    var currentTop = b[1].value;
    layer.translate(left - currentLeft, top - currentTop);
    return layer;
}

function placeFileSized(fileObj, layerName, left, top, targetWidth, targetHeight) {
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), fileObj);
    desc.putEnumerated(charIDToTypeID("FTcs"), charIDToTypeID("QCSt"), charIDToTypeID("Qcsa"));
    executeAction(charIDToTypeID("Plc "), desc, DialogModes.NO);
    var layer = app.activeDocument.activeLayer;
    layer.name = layerName;
    var b = layer.bounds;
    var currentWidth = b[2].value - b[0].value;
    var currentHeight = b[3].value - b[1].value;
    layer.resize((targetWidth / currentWidth) * 100, (targetHeight / currentHeight) * 100, AnchorPosition.TOPLEFT);
    b = layer.bounds;
    layer.translate(left - b[0].value, top - b[1].value);
    return layer;
}

var doc = app.open(templateFile);
app.activeDocument = doc;
var oldUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
hideLayerByName(doc, "图层 8");
hideLayerByName(doc, "作品简介正文填写");

placeFileSized(logoFile, "中国传媒大学校徽", 402, 487, 477, 477);
placeFileSized(overlayFile, "越韵清音项目内容", 0, 0, 4724, 11811);

var psdOptions = new PhotoshopSaveOptions();
psdOptions.layers = true;
doc.saveAs(outPsd, psdOptions, true, Extension.LOWERCASE);

var exportDoc = doc.duplicate("越韵清音易拉宝-导出", true);
exportDoc.flatten();
exportDoc.changeMode(ChangeMode.RGB);

var jpgOptions = new JPEGSaveOptions();
jpgOptions.quality = 12;
exportDoc.saveAs(outJpg, jpgOptions, true, Extension.LOWERCASE);

var pngOptions = new PNGSaveOptions();
exportDoc.saveAs(outPng, pngOptions, true, Extension.LOWERCASE);

var pdfOptions = new PDFSaveOptions();
pdfOptions.preserveEditing = false;
exportDoc.saveAs(outPdf, pdfOptions, true, Extension.LOWERCASE);

exportDoc.close(SaveOptions.DONOTSAVECHANGES);
doc.close(SaveOptions.DONOTSAVECHANGES);
app.preferences.rulerUnits = oldUnits;
