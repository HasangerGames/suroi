import { type ObjectDefinition, ObjectDefinitions } from "../../../../common/src/utils/objectDefinitions";

export interface CrosshairDefinition extends ObjectDefinition {
    readonly svg?: string
}

// NOTE: make the crosshair path 16x16 pixels and the view box 20x20 pixels so theres space for the stroke

export const Crosshairs = new ObjectDefinitions<CrosshairDefinition>([
    {
        idString: "default",
        name: "Default"
    },
    {
        idString: "01",
        name: "01",
        svg: '<path d="m2.5135417.52916667v1.98437503h-1.98437503v.2645833h1.98437503v1.9843749h.2645833v-1.9843749h1.9843749v-.2645833h-1.9843749v-1.98437503z"/>'
    },
    {
        idString: "02",
        name: "02",
        svg: '<path d="m2.441453.5291666v1.453658h.4092773v-1.453658zm-1.1983765.7002157v1.0924397h.344165v-.7482747h.7482748v-.344165zm1.7135905 0v.344165h.7482747v.7482747h.3441651v-1.0924397zm-2.4406779 1.1983764v.4092774h1.453658v-.4092774zm2.8060303 0v.4092774h1.453658v-.4092774zm-2.0789429.5152141v1.0924397h1.0924398v-.344165h-.7482748v-.7482747zm2.4618652 0v.7482747h-.7482747v.344165h1.0924398v-1.0924397zm-1.2634887.3658691v1.453658h.4092773v-1.453658z"/>'
    },
    {
        idString: "03",
        name: "03",
        svg: '<path d="m 2.6429911,0.52916667 c -0.073289,0 -0.1322916,0.059002 -0.1322916,0.13229166 V 1.0645345 C 1.7411327,1.1286256 1.1257834,1.7439749 1.0616923,2.5135417 H 0.66430054 c -0.0732897,0 -0.13229166,0.059002 -0.13229166,0.1322916 0,0.073289 0.059002,0.1322917 0.13229166,0.1322917 H 1.0611755 c 0.063612,0.7700628 0.6796027,1.38592 1.449524,1.4500406 v 0.4020427 c 0,0.07329 0.059002,0.1322916 0.1322916,0.1322916 0.073289,0 0.1322917,-0.059002 0.1322917,-0.1322916 V 4.2286824 C 3.5457002,4.1650414 4.1621991,3.5485424 4.2258402,2.778125 h 0.4015259 c 0.07329,0 0.1322916,-0.059002 0.1322916,-0.1322917 0,-0.073289 -0.059002,-0.1322916 -0.1322916,-0.1322916 H 4.2253234 C 4.1612028,1.7436204 3.5453456,1.1276296 2.7752828,1.0640177 V 0.66145833 c 0,-0.0732897 -0.059002,-0.13229166 -0.1322917,-0.13229166 z M 2.7752828,1.3286011 c 0.6261544,0.061742 1.1218721,0.5587361 1.183907,1.1849406 H 3.8336161 c -0.07329,0 -0.1322917,0.059002 -0.1322917,0.1322916 0,0.073289 0.059002,0.1322917 0.1322917,0.1322917 H 3.9591898 C 3.8975952,3.4046039 3.4017617,3.9004374 2.7752828,3.962032 V 3.8364583 c 0,-0.07329 -0.059002,-0.1322917 -0.1322917,-0.1322917 -0.073289,0 -0.1322916,0.059002 -0.1322916,0.1322917 V 3.962032 C 1.884495,3.8999971 1.3875006,3.4042794 1.3257589,2.778125 h 0.1322916 c 0.07329,0 0.1322917,-0.059002 0.1322917,-0.1322917 0,-0.073289 -0.059002,-0.1322916 -0.1322917,-0.1322916 H 1.3262756 C 1.3884739,1.8876926 1.8848504,1.3913161 2.5106995,1.3291178 v 0.1260905 c 0,0.07329 0.059002,0.1322917 0.1322916,0.1322917 0.073289,0 0.1322917,-0.059002 0.1322917,-0.1322917 z M 2.6455749,2.4634155 A 0.182548,0.182548 0 0 0 2.4631571,2.6458333 0.182548,0.182548 0 0 0 2.6455749,2.8282511 0.182548,0.182548 0 0 0 2.8285095,2.6458333 0.182548,0.182548 0 0 0 2.6455749,2.4634155 Z" />'
    },
    {
        idString: "04",
        name: "04",
        svg: '<path d="m.94981276.52916708-.42064637.43201478 1.45003981 1.44590634.4278807-.0000001.0000001-.4247802zm3.38067114-.00000056-1.4459065 1.45004098-.0000002.4278807h.4247802l1.4531412-1.45727563zm-2.348177 2.35541208-1.45314118 1.4572756.43201471.420646 1.44590657-1.4500408.0000001-.4278808zm.9022702-.0000002-.0000001.4247803 1.4572745 1.453141.4206494-.4320118-1.4500399-1.4459063z"/>'
    },
    {
        idString: "05",
        name: "05",
        svg: '<g transform="translate(-15.102 108.23)"><path d="m17.565 122.2a200 200 0 0 0 169.05 167.35v-36.756a163.81 163.81 0 0 1-17.668-3.8432 163.81 163.81 0 0 1-21.899-8.168 163.81 163.81 0 0 1-20.513-11.201 163.81 163.81 0 0 1-18.711-14.006 163.81 163.81 0 0 1-16.527-16.527 163.81 163.81 0 0 1-14.007-18.71 163.81 163.81 0 0 1-11.201-20.514 163.81 163.81 0 0 1-8.1675-21.899 163.81 163.81 0 0 1-3.4205-15.721zm358.13 0a163.81 163.81 0 0 1-3.4199 15.721 163.81 163.81 0 0 1-8.168 21.899 163.81 163.81 0 0 1-11.201 20.514 163.81 163.81 0 0 1-14.006 18.71 163.81 163.81 0 0 1-16.527 16.527 163.81 163.81 0 0 1-18.71 14.006 163.81 163.81 0 0 1-20.514 11.201 163.81 163.81 0 0 1-21.899 8.168 163.81 163.81 0 0 1-13.774 2.9962v36.839a200 200 0 0 0 165.16-166.58z" stroke-width=".45282"/><path d="m186.62-106.01a200 200 0 0 0-169.05 167.35h36.939a163.81 163.81 0 0 1 3.4205-15.721 163.81 163.81 0 0 1 8.1675-21.899 163.81 163.81 0 0 1 11.201-20.513 163.81 163.81 0 0 1 14.007-18.711 163.81 163.81 0 0 1 16.527-16.527 163.81 163.81 0 0 1 18.711-14.007 163.81 163.81 0 0 1 20.513-11.201 163.81 163.81 0 0 1 21.899-8.168 163.81 163.81 0 0 1 17.668-3.8432zm60.861 0.74621v36.46a163.81 163.81 0 0 1 7.4264 1.6676 163.81 163.81 0 0 1 7.7489 2.1446 163.81 163.81 0 0 1 7.6347 2.5218 163.81 163.81 0 0 1 7.5014 2.8939 163.81 163.81 0 0 1 7.351 3.2582 163.81 163.81 0 0 1 7.1815 3.6153 163.81 163.81 0 0 1 6.996 3.9631 163.81 163.81 0 0 1 6.7929 4.3015 163.81 163.81 0 0 1 6.5738 4.6297 163.81 163.81 0 0 1 6.3386 4.9465 163.81 163.81 0 0 1 6.088 5.2519 163.81 163.81 0 0 1 5.8234 5.5438 163.81 163.81 0 0 1 5.5438 5.8234 163.81 163.81 0 0 1 5.2519 6.088 163.81 163.81 0 0 1 4.947 6.3386 163.81 163.81 0 0 1 4.6297 6.5738 163.81 163.81 0 0 1 4.3016 6.7929 163.81 163.81 0 0 1 3.9631 6.996 163.81 163.81 0 0 1 3.6148 7.182 163.81 163.81 0 0 1 3.2582 7.3505 163.81 163.81 0 0 1 2.8939 7.5014 163.81 163.81 0 0 1 2.5223 7.6347 163.81 163.81 0 0 1 2.1441 7.7489 163.81 163.81 0 0 1 1.7616 7.845 163.81 163.81 0 0 1 0.2651 1.5281h36.717a200 200 0 0 0-165.27-166.6z" stroke-width=".45282"/><path d="m215.1-30.512a122.28 122.28 0 0 0-122.28 122.28 122.28 122.28 0 0 0 17.472 62.559l29.287-29.287a82.446 83.553 0 0 1-3.5822-9.7327 82.446 83.553 0 0 1-2.5006-11.648 82.446 83.553 0 0 1-0.83923-11.891 82.446 83.553 0 0 1 0.83923-11.891 82.446 83.553 0 0 1 2.5006-11.648 82.446 83.553 0 0 1 4.1109-11.17 82.446 83.553 0 0 1 5.6374-10.463 82.446 83.553 0 0 1 7.0497-9.5436 82.446 83.553 0 0 1 8.3178-8.4295 82.446 83.553 0 0 1 9.417-7.1438 82.446 83.553 0 0 1 10.324-5.7133 82.446 83.553 0 0 1 11.022-4.1662 82.446 83.553 0 0 1 11.494-2.5342 82.446 83.553 0 0 1 11.734-0.85008 82.446 83.553 0 0 1 4.0452 0.10025 82.446 83.553 0 0 1 4.0359 0.30179 82.446 83.553 0 0 1 4.0163 0.50229 82.446 83.553 0 0 1 3.9868 0.70073 82.446 83.553 0 0 1 3.9486 0.89865 82.446 83.553 0 0 1 3.9 1.094 82.446 83.553 0 0 1 3.8421 1.2862 82.446 83.553 0 0 1 3.7755 1.4759 82.446 83.553 0 0 1 2.3394 1.0506l28.669-28.669a122.28 122.28 0 0 0-62.558-17.472zm104.81 59.724-29.232 29.232a82.446 83.553 0 0 1 0.59169 1.3524 82.446 83.553 0 0 1 1.4562 3.8266 82.446 83.553 0 0 1 1.2692 3.8938 82.446 83.553 0 0 1 1.0795 3.9522 82.446 83.553 0 0 1 0.88677 4.0013 82.446 83.553 0 0 1 0.69143 4.0406 82.446 83.553 0 0 1 0.49558 4.0706 82.446 83.553 0 0 1 0.29765 4.0897 82.446 83.553 0 0 1 0.0992 4.0995 82.446 83.553 0 0 1-0.83922 11.891 82.446 83.553 0 0 1-2.5001 11.648 82.446 83.553 0 0 1-4.1109 11.17 82.446 83.553 0 0 1-5.6379 10.463 82.446 83.553 0 0 1-7.0492 9.5436 82.446 83.553 0 0 1-8.3184 8.4295 82.446 83.553 0 0 1-9.417 7.1438 82.446 83.553 0 0 1-10.324 5.7133 82.446 83.553 0 0 1-11.022 4.1662 82.446 83.553 0 0 1-11.494 2.5342 82.446 83.553 0 0 1-11.733 0.85008 82.446 83.553 0 0 1-11.734-0.85008 82.446 83.553 0 0 1-11.494-2.5342 82.446 83.553 0 0 1-10.659-4.0292l-28.672 28.672a122.28 122.28 0 0 0 62.559 17.472 122.28 122.28 0 0 0 122.28-122.28 122.28 122.28 0 0 0-17.472-62.558z" stroke-width=".309"/><circle cx="215.1" cy="91.771" r="22.684" stroke-width=".26458"/></g>'
    },
    {
        idString: "06",
        name: "06",
        svg: '<g><path d="m200-1.9559e-4a200 200 0 0 0-200 200 200 200 0 0 0 200 200 200 200 0 0 0 200-200 200 200 0 0 0-200-200zm0 36.496a162.25 163.5 0 0 1 7.9608 0.19689 162.25 163.5 0 0 1 7.9422 0.59014 162.25 163.5 0 0 1 7.9034 0.98237 162.25 163.5 0 0 1 7.846 1.372 162.25 163.5 0 0 1 7.7701 1.7585 162.25 163.5 0 0 1 7.675 2.1404 162.25 163.5 0 0 1 7.5613 2.5172 162.25 163.5 0 0 1 7.43 2.8882 162.25 163.5 0 0 1 7.2802 3.252 162.25 163.5 0 0 1 7.1133 3.6086 162.25 163.5 0 0 1 6.9288 3.9553 162.25 163.5 0 0 1 6.7278 4.2938 162.25 163.5 0 0 1 6.5107 4.6209 162.25 163.5 0 0 1 6.2782 4.9372 162.25 163.5 0 0 1 6.0296 5.2421 162.25 163.5 0 0 1 5.7676 5.5335 162.25 163.5 0 0 1 5.4911 5.812 162.25 163.5 0 0 1 5.2018 6.0771 162.25 163.5 0 0 1 4.8989 6.3262 162.25 163.5 0 0 1 4.5858 6.5614 162.25 163.5 0 0 1 4.2602 6.7805 162.25 163.5 0 0 1 3.9253 6.9825 162.25 163.5 0 0 1 3.5802 7.168 162.25 163.5 0 0 1 3.2272 7.337 162.25 163.5 0 0 1 2.866 7.4874 162.25 163.5 0 0 1 2.498 7.6202 162.25 163.5 0 0 1 2.1239 7.7344 162.25 163.5 0 0 1 1.7451 7.83 162.25 163.5 0 0 1 1.3612 7.907 162.25 163.5 0 0 1 0.97514 7.9649 162.25 163.5 0 0 1 0.58549 8.0036 162.25 163.5 0 0 1 0.19534 8.0228 162.25 163.5 0 0 1-1.6511 23.269 162.25 163.5 0 0 1-4.9206 22.796 162.25 163.5 0 0 1-8.09 21.858 162.25 163.5 0 0 1-11.094 20.475 162.25 163.5 0 0 1-13.873 18.676 162.25 163.5 0 0 1-16.369 16.496 162.25 163.5 0 0 1-18.532 13.98 162.25 163.5 0 0 1-20.318 11.18 162.25 163.5 0 0 1-21.689 8.1525 162.25 163.5 0 0 1-22.62 4.9589 162.25 163.5 0 0 1-23.09 1.6645 162.25 163.5 0 0 1-23.09-1.6645 162.25 163.5 0 0 1-22.62-4.9589 162.25 163.5 0 0 1-21.69-8.1525 162.25 163.5 0 0 1-20.318-11.18 162.25 163.5 0 0 1-18.532-13.98 162.25 163.5 0 0 1-16.369-16.496 162.25 163.5 0 0 1-13.873-18.676 162.25 163.5 0 0 1-11.094-20.475 162.25 163.5 0 0 1-8.0894-21.858 162.25 163.5 0 0 1-4.9206-22.796 162.25 163.5 0 0 1-1.6516-23.269 162.25 163.5 0 0 1 1.6516-23.269 162.25 163.5 0 0 1 4.9206-22.796 162.25 163.5 0 0 1 8.0894-21.858 162.25 163.5 0 0 1 11.094-20.475 162.25 163.5 0 0 1 13.873-18.675 162.25 163.5 0 0 1 16.369-16.496 162.25 163.5 0 0 1 18.532-13.98 162.25 163.5 0 0 1 20.318-11.18 162.25 163.5 0 0 1 21.69-8.1525 162.25 163.5 0 0 1 22.62-4.9589 162.25 163.5 0 0 1 23.09-1.664z" stroke-width=".31379"/><rect transform="rotate(224.22)" x="-298.16" y="-167.34" width="30.683" height="327.01" stroke-width=".2034"/><rect transform="rotate(134.22)" x="-11.502" y="-446.32" width="30.683" height="327.01" stroke-width=".2034"/></g>"
    },
    {
        idString: "07",
        name: "06",
        svg: '<g stroke-width=".26458"><path transform="matrix(1.131 0 0 1.131 232.74 277.91)" d="m-28.945-245.72-53.573 92.791h31.478l22.095-38.269 22.095 38.269h31.478zm-113.43 196.46-63.404 109.82h126.81l-16.924-29.313h-61.482l30.741-53.245zm226.85 4.57e-4 -15.739 27.261 30.741 53.245h-61.482l-16.924 29.313h126.81z"/><path transform="matrix(1.275 .021111 -.021111 1.275 71.076 37.608)" d="m206.81 76.918-206.81 3.6246 106.55 177.29zm-37.118 19.625-64.172 116.29-68.622-113.72z"/></g>'
    },
    {
        idString: "08",
        name: "08",
        svg: '<g stroke-width=".26458"><path d="m200 0a200 200 0 0 0-200 200 200 200 0 0 0 200 200 200 200 0 0 0 200-200 200 200 0 0 0-200-200zm0 35.237a164.76 164.76 0 0 1 164.76 164.76 164.76 164.76 0 0 1-164.76 164.76 164.76 164.76 0 0 1-164.76-164.76 164.76 164.76 0 0 1 164.76-164.76z"/><rect x="175.46" y="190.56" width="49.081" height="18.877"/><rect transform="rotate(-90)" x="-224.54" y="190.56" width="49.081" height="18.877"/></g>'
    },
    {
        idString: "09",
        name: "09",
        svg: '<g><path d="m66.602 66.602v103.87h32.72v-71.152h71.152v-32.72zm162.92 0v32.72h71.152v71.153h32.72v-103.87zm-162.92 162.92v103.87h103.87v-32.72h-71.153v-71.152zm234.08 0v71.152h-71.152v32.72h103.87v-103.87z" stroke-width=".26458"/><rect x="-2.5169" y="180.54" width="138.24" height="38.915" stroke-width=".21997"/><rect x="264.28" y="180.54" width="138.24" height="38.915" stroke-width=".21997"/><rect transform="rotate(90)" x="264.28" y="-219.46" width="138.24" height="38.915" stroke-width=".21997"/><rect transform="rotate(90)" y="-219.46" width="138.24" height="38.915" stroke-width=".21997"/></g>'
    },
    {
        idString: "10",
        name: "10",
        svg: '<g><path d="m0 174.83v50.339h116.31v-50.339zm283.69 0v50.339h116.31v-50.339z" stroke-width=".26458"/><path transform="rotate(-90)" d="m0 174.83h-116.31v50.339h116.31zm-283.69 0h-116.31v50.339h116.31z" stroke-width=".26458"/><path d="m233.4 28.798v36.814a138.96 138.96 0 0 1 101.44 100.99h36.753a174.83 174.83 0 0 0-138.2-137.8zm-66.797 0.077a174.83 174.83 0 0 0-137.8 137.73h36.744a138.96 138.96 0 0 1 101.06-100.9zm-137.8 204.52a174.83 174.83 0 0 0 138 137.77v-36.824a138.96 138.96 0 0 1-101.25-100.95zm305.65 0a138.96 138.96 0 0 1-100.86 100.84v36.841a174.83 174.83 0 0 0 137.6-137.69z" stroke-width=".23129"/></g>'
    },
    {
        idString: "11",
        name: "11",
        svg: '<g><path transform="matrix(1.1506 0 0 1.1506 149.32 200)" d="m44.047-173.82-150.54 86.912v173.82l150.54 86.912 150.54-86.912v-173.82zm0 33.469 121.55 70.177v140.36l-121.55 70.177-121.55-70.177v-140.36z" stroke-width=".26458"/><rect x="183.69" y="198.84" width="32.623" height="162.65" stroke-width=".23762"/><rect transform="rotate(60)" x="256.89" y="-234.7" width="32.623" height="162.65" stroke-width=".23762"/><rect transform="rotate(120)" x="55.888" y="-272.62" width="32.623" height="162.65" stroke-width=".23762"/></g>'
    },
    {
        idString: "12",
        name: "12",
        svg: '<g><path d="m219.46 1.3477v58.916l110.06 190.63 51.023 29.458-80.542-139.5zm-38.915 5.168e-4 -161.08 279.01 51.023-29.458 54.52-94.431 55.542-96.202zm-93.672 285.02-47.955 27.687h322.17l-47.955-27.687h-113.13z" stroke-width=".63886"/><rect x="174.15" y="286.37" width="51.695" height="85.943" stroke-width=".26458"/><rect transform="rotate(60)" x="247.16" y="-245.87" width="51.695" height="85.943" stroke-width=".26458"/><rect transform="rotate(-60)" x="-98.851" y="100.54" width="51.695" height="85.943" stroke-width=".26458"/><circle cx="200" cy="200" r="20.765" stroke-width=".18577"/></g>'
    },
    {
        idString: "13",
        name: "13",
        svg: '<g stroke-width=".46993"><path transform="matrix(-.69753 .71655 -.70817 -.70604 0 0)" d="m-28.063-28.481 56.978-5.7e-5 -1.58e-4 -193.5-28.537-28.962-28.441 28.014zm28.537-286.25 28.441-28.014-1.91e-4 -194.45-56.978 6e-5 1.58e-4 193.5z"/><path transform="matrix(-.71655 -.69753 .70604 -.70817 0 0)" d="m-254.37 250.55-1.6e-4 -193.5-28.537-28.962-28.441 28.014 1.9e-4 194.45zm1.3e-4 -314.27-2e-4 -194.45-56.978 5e-5 1.6e-4 193.5 28.537 28.962z"/></g>'
    },
    {
        idString: "14",
        name: "14",
        svg: '<g><path transform="rotate(90)" d="m179.77 0h40.466v-169.01a37.028 37.028 0 0 1-20.233 6.0389 37.028 37.028 0 0 1-20.233-6.0389zm0-231a37.028 37.028 0 0 1 20.233-6.026 37.028 37.028 0 0 1 20.233 6.0384v-169.01h-40.466z" stroke-width=".29424"/><path d="m179.77 0v169.01a37.028 37.028 0 0 1 20.233-6.0389 37.028 37.028 0 0 1 20.233 6.026v-169zm0 230.99v169.01h40.466v-169.01a37.028 37.028 0 0 1-20.233 6.0389 37.028 37.028 0 0 1-20.233-6.0389z" stroke-width=".29424"/><circle cx="200" cy="200" r="28.63" stroke-width=".037876"/><path d="m200 27.057a174.2 172.94 0 0 0-174.2 172.94 174.2 172.94 0 0 0 174.2 172.94 174.2 172.94 0 0 0 174.2-172.94 174.2 172.94 0 0 0-174.2-172.94zm0 38.443a135.41 134.5 0 0 1 6.644 0.16175 135.41 134.5 0 0 1 6.628 0.48576 135.41 134.5 0 0 1 6.596 0.80822 135.41 134.5 0 0 1 6.5479 1.1286 135.41 134.5 0 0 1 6.4849 1.4464 135.41 134.5 0 0 1 6.4053 1.7606 135.41 134.5 0 0 1 6.3102 2.0707 135.41 134.5 0 0 1 6.2007 2.3761 135.41 134.5 0 0 1 6.0761 2.6753 135.41 134.5 0 0 1 5.9366 2.9683 135.41 134.5 0 0 1 5.7826 3.2535 135.41 134.5 0 0 1 5.6146 3.5321 135.41 134.5 0 0 1 5.4338 3.8013 135.41 134.5 0 0 1 5.2395 4.0612 135.41 134.5 0 0 1 5.0322 4.3124 135.41 134.5 0 0 1 4.8137 4.5517 135.41 134.5 0 0 1 4.5827 4.7816 135.41 134.5 0 0 1 4.3408 4.9987 135.41 134.5 0 0 1 4.0892 5.2043 135.41 134.5 0 0 1 3.8266 5.3971 135.41 134.5 0 0 1 3.5559 5.5774 135.41 134.5 0 0 1 3.2758 5.7438 135.41 134.5 0 0 1 2.9879 5.8968 135.41 134.5 0 0 1 2.6934 6.0353 135.41 134.5 0 0 1 2.3916 6.1593 135.41 134.5 0 0 1 2.0851 6.2684 135.41 134.5 0 0 1 1.7725 6.3624 135.41 134.5 0 0 1 1.4562 6.4415 135.41 134.5 0 0 1 1.1358 6.5045 135.41 134.5 0 0 1 0.81391 6.5515 135.41 134.5 0 0 1 0.48886 6.5841 135.41 134.5 0 0 1 0.16278 6.5996 135.41 134.5 0 0 1-1.3782 19.141 135.41 134.5 0 0 1-4.1067 18.752 135.41 134.5 0 0 1-6.751 17.98 135.41 134.5 0 0 1-9.2589 16.843 135.41 134.5 0 0 1-11.578 15.363 135.41 134.5 0 0 1-13.661 13.569 135.41 134.5 0 0 1-15.466 11.501 135.41 134.5 0 0 1-16.956 9.1969 135.41 134.5 0 0 1-18.101 6.706 135.41 134.5 0 0 1-18.878 4.0793 135.41 134.5 0 0 1-19.27 1.3689 135.41 134.5 0 0 1-19.271-1.3689 135.41 134.5 0 0 1-18.878-4.0793 135.41 134.5 0 0 1-18.101-6.706 135.41 134.5 0 0 1-16.956-9.1969 135.41 134.5 0 0 1-15.466-11.501 135.41 134.5 0 0 1-13.661-13.569 135.41 134.5 0 0 1-11.578-15.363 135.41 134.5 0 0 1-9.2589-16.843 135.41 134.5 0 0 1-6.751-17.98 135.41 134.5 0 0 1-4.1067-18.752 135.41 134.5 0 0 1-1.3782-19.141 135.41 134.5 0 0 1 1.3782-19.141 135.41 134.5 0 0 1 4.1067-18.752 135.41 134.5 0 0 1 6.751-17.98 135.41 134.5 0 0 1 9.2589-16.843 135.41 134.5 0 0 1 11.578-15.362 135.41 134.5 0 0 1 13.661-13.57 135.41 134.5 0 0 1 15.466-11.501 135.41 134.5 0 0 1 16.956-9.1969 135.41 134.5 0 0 1 18.101-6.706 135.41 134.5 0 0 1 18.878-4.0793 135.41 134.5 0 0 1 19.271-1.3689z" stroke-width=".26458"/></g>'
    }
]);

export function getCrosshair(
    idString: CrosshairDefinition["idString"],
    color: string,
    size: number,
    strokeColor: string,
    strokeSize: number
): string {
    const crosshair = Crosshairs.definitions[Crosshairs.idStringToNumber[idString]];
    if (crosshair.svg === undefined) return "crosshair";
    return `data:image/svg+xml,${encodeURIComponent(`<svg fill="${color}" height="${size}" width="${size}" stroke="${strokeColor}" stroke-width="${strokeSize}" viewBox="0 0 5.2916665 5.2916666" xmlns="http://www.w3.org/2000/svg">${crosshair.svg}</svg>`)}`;
}
