import {
    type ObjectDefinition,
    ObjectDefinitions
} from "../../../../common/src/utils/objectDefinitions";

export interface CrosshairDefinition extends ObjectDefinition {
    svg: string
}

export const Crosshairs = new ObjectDefinitions<CrosshairDefinition>([
    {
        idString: "default",
        name: "Default",
        svg: "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3C!-- Created with Inkscape (http://www.inkscape.org/) --%3E%3Csvg width='@Width@' height='@Height@' viewBox='0 0 4.2333332 4.2333333' version='1.1' id='svg1' inkscape:version='1.3 (0e150ed6c4, 2023-07-21)' sodipodi:docname='default.svg' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Csodipodi:namedview id='namedview1' pagecolor='%23ffffff' bordercolor='%23@Color@' borderopacity='0.25' inkscape:showpageshadow='2' inkscape:pageopacity='0.0' inkscape:pagecheckerboard='0' inkscape:deskcolor='%23d1d1d1' inkscape:document-units='mm' inkscape:zoom='50.685971' inkscape:cx='7.6155195' inkscape:cy='7.5859256' inkscape:window-width='1920' inkscape:window-height='1166' inkscape:window-x='-11' inkscape:window-y='-11' inkscape:window-maximized='1' inkscape:current-layer='layer1' /%3E%3Cdefs id='defs1' /%3E%3Cg inkscape:label='Layer 1' inkscape:groupmode='layer' id='layer1'%3E%3Crect style='fill:%23@Color@;stroke:%23ffffff;stroke-width:0;stroke-dasharray:none' id='rect1' width='0.2499993' height='4.2333322' x='1.991667' y='5.0061766e-07' ry='0' /%3E%3Crect style='fill:%23@Color@;stroke:%23ffffff;stroke-width:0;stroke-dasharray:none' id='rect1-8' width='0.2499993' height='4.2333326' x='1.991667' y='-4.2333331' ry='0' transform='rotate(90)' /%3E%3C/g%3E%3C/svg%3E%0A"
    },
    {
        idString: "cross",
        name: "Cross",
        svg: "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3C!-- Created with Inkscape (http://www.inkscape.org/) --%3E%3Csvg width='@Width@' height='@Height@' viewBox='0 0 4.2333332 4.2333333' version='1.1' id='svg1' xml:space='preserve' inkscape:version='1.3 (0e150ed6c4, 2023-07-21)' sodipodi:docname='cross.svg' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Csodipodi:namedview id='namedview1' pagecolor='%23@Color@' bordercolor='%23@Color@' borderopacity='0.25' inkscape:showpageshadow='2' inkscape:pageopacity='0.0' inkscape:pagecheckerboard='0' inkscape:deskcolor='%23d1d1d1' inkscape:document-units='mm' inkscape:zoom='50.685971' inkscape:cx='9.0163016' inkscape:cy='8.3750986' inkscape:window-width='1920' inkscape:window-height='1166' inkscape:window-x='-11' inkscape:window-y='-11' inkscape:window-maximized='1' inkscape:current-layer='layer1' /%3E%3Cdefs id='defs1' /%3E%3Cg inkscape:label='Layer 1' inkscape:groupmode='layer' id='layer1'%3E%3Cpath style='fill:%23@Color@;stroke-width:0.0333205' d='m 2.0328818,3.4020986 v -0.831229 h 0.083785 0.083785 v 0.831229 0.8312347 H 2.1166664 2.0328818 Z M 0.92604152,2.9014979 V 2.4956976 l 0.0782728,0.00114 0.078273,0.00114 0.00114,0.3251938 0.00114,0.3251882 0.3251887,0.00114 0.3251887,0.00114 0.00119,0.07827 0.00119,0.078276 H 1.3318292 0.92603301 Z M 2.4959028,3.2301195 V 3.1529521 H 2.8244266 3.1529511 V 2.8244272 2.4959022 h 0.07717 0.07717 V 2.9015945 3.3072923 H 2.9015973 2.4959028 Z M 0,2.1166658 V 2.0328818 H 0.83123236 1.6624654 v 0.083784 0.083784 H 0.83123236 0 Z m 2.5708679,0 v -0.083784 h 0.831233 0.8312324 v 0.083784 0.083784 H 3.4021009 2.5708679 Z M 0.92604152,1.3295316 V 0.9260393 H 1.3295309 1.733021 v 0.0771733 0.077167 H 1.4067016 1.0803817 V 1.4066989 1.7330182 H 1.0032117 0.9260411 Z M 3.1529511,1.4066984 V 1.0803795 H 2.8266322 2.5003123 V 1.0009835 0.9215879 l 0.4045923,0.001138 0.4045916,0.001138 0.00114,0.4045894 0.00114,0.4045951 H 3.2323716 3.1529737 Z M 2.0328818,0.83123303 V -1.6713418e-6 h 0.083785 0.083785 V 0.83123303 1.6624677 h -0.083785 -0.083785 z' id='path2' /%3E%3C/g%3E%3C/svg%3E"
    },
    {
        idString: "precision",
        name: "Precision",
        svg: "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8' standalone='no'%3F%3E%3C!-- Created with Inkscape (http://www.inkscape.org/) --%3E%3Csvg width='@Width@' height='@Height@' viewBox='0 0 4.2333333 4.2333332' version='1.1' id='svg2' inkscape:version='1.3 (0e150ed6c4, 2023-07-21)' sodipodi:docname='crosshair_icon.svg' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns='http://www.w3.org/2000/svg' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Csodipodi:namedview id='namedview1' pagecolor='%23@Color@' bordercolor='%23@Color@' borderopacity='0.25' inkscape:showpageshadow='2' inkscape:pageopacity='0.0' inkscape:pagecheckerboard='0' inkscape:deskcolor='%23d1d1d1' inkscape:document-units='mm' inkscape:zoom='25.342986' inkscape:cx='6.3528427' inkscape:cy='6.372572' inkscape:window-width='1920' inkscape:window-height='1166' inkscape:window-x='-11' inkscape:window-y='-11' inkscape:window-maximized='1' inkscape:current-layer='layer1' /%3E%3Cdefs id='defs1' /%3E%3Cg inkscape:label='Layer 1' inkscape:groupmode='layer' id='layer1'%3E%3Ccircle style='fill:%23@Color@;stroke-width:0.0619049' id='path2' cx='2.119453' cy='2.1166673' r='0.18254788' /%3E%3Crect style='fill:%23@Color@;stroke-width:0.0723768' id='rect2' width='1.0583333' height='0.26458332' x='0.0055726767' y='1.9843756' ry='0.13229166' /%3E%3Crect style='fill:%23@Color@;stroke-width:0.0723768' id='rect2-1' width='1.0583333' height='0.26458332' x='1.0728836e-06' y='-2.2489583' ry='0.13229166' transform='rotate(90)' /%3E%3Crect style='fill:%23@Color@;stroke-width:0.0723768' id='rect2-0' width='1.0583333' height='0.26458332' x='3.175' y='1.9843756' ry='0.13229166' /%3E%3Crect style='fill:%23@Color@;stroke-width:0.0723768' id='rect2-2' width='1.0583333' height='0.26458332' x='3.1750002' y='-2.2489583' ry='0.13229166' transform='rotate(90)' /%3E%3Ccircle style='fill:none;stroke-width:0.26458333;stroke:%23@Color@;stroke-opacity:1;stroke-dasharray:none' id='path1-7' cx='2.1166666' cy='2.1166673' r='1.4552083' /%3E%3C/g%3E%3C/svg%3E%0A"
    }
]);

export function getCrosshair(
    idString: CrosshairDefinition["idString"],
    color: string,
    size: number
): string {
    const crosshair =
        Crosshairs.definitions[Crosshairs.idStringToNumber[idString]];

    const svg = crosshair.svg
        .replace(/@Color@/g, color)
        .replace(/@Width@/g, size.toString())
        .replace(/@Height@/g, size.toString());

    return svg;
}
