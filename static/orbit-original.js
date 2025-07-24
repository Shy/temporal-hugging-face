
/*
* orbit
* v.1.4.3
* Author Juan Martin Muda - Zumerlab
* License MIT
**/
(() => {
  // src/js/orbit-base.js
  var OrbitBase = class extends HTMLElement {
    constructor() {
      super();
      this.commonProperties = {
        orbitRadius: 0,
        arcHeight: 0,
        realRadius: 0,
        arcAngle: 0,
        shape: "none",
        arcHeightPercentage: 0,
        orbitNumber: 1,
        size: 1,
        strokeWidth: 1
      };
    }
    getCommonAttributes(element) {
      const orbitRadius = parseFloat(getComputedStyle(element).getPropertyValue("r") || 0);
      const orbitNumber = parseFloat(getComputedStyle(element).getPropertyValue("--o-orbit-number") || 1);
      const size = parseFloat(getComputedStyle(element).getPropertyValue("--o-size-ratio") || 1);
      const strokeWidth = parseFloat(getComputedStyle(element).getPropertyValue("--o-stroke-width") || 1);
      const shape = element.getAttribute("shape") || "none";
      const arcHeight = orbitRadius / orbitNumber * size - strokeWidth + 0.3;
      const arcHeightPercentage = arcHeight / 2 * 100 / orbitRadius / 2;
      let innerOuter = 0;
      if (element.classList.contains("outer-orbit")) {
        innerOuter = arcHeightPercentage;
      } else if (element.classList.contains("quarter-outer-orbit")) {
        innerOuter = arcHeightPercentage * -0.5;
      } else if (element.classList.contains("inner-orbit")) {
        innerOuter = arcHeightPercentage * -1;
      } else if (element.classList.contains("quarter-inner-orbit")) {
        innerOuter = arcHeightPercentage * 0.5;
      }
      const realRadius = 50 + innerOuter;
      return {
        orbitRadius,
        arcHeight,
        realRadius,
        arcAngle: 0,
        // Se sobrescribe en cada componente
        shape,
        arcHeightPercentage,
        orbitNumber,
        size,
        strokeWidth
      };
    }
    getProgressAngle(maxAngle, value, maxValue = 100) {
      return value / maxValue * maxAngle;
    }
    getControlPoint(x, y, x1, y1, direction = "clockwise") {
      const xm = (x + x1) / 2;
      const ym = (y + y1) / 2;
      const dx = x1 - x;
      const dy = y1 - y;
      if (direction === "clockwise") {
        return {
          xc: xm + dy * 0.4,
          yc: ym - dx * 0.4
        };
      }
      return {
        xc: xm - dy * 0.4,
        yc: ym + dx * 0.4
      };
    }
    arcPoint(radius, angle, radiusAdjustment = 0, angleOffsetDegrees = 0) {
      const adjustedRadius = radius + radiusAdjustment;
      const adjustedAngle = angle + angleOffsetDegrees * Math.PI / 180;
      return {
        x: 50 + adjustedRadius * Math.cos(adjustedAngle),
        y: 50 + adjustedRadius * Math.sin(adjustedAngle)
      };
    }
    calculateCommonArcParameters(arcAngle, radius, arcHeightPercentage, orbitNumber, shape, strokeWidth, arcHeight, gap = 0) {
      const offset = Math.PI / 2;
      const fangle = arcAngle * Math.PI / 180;
      const bigRadius = radius + arcHeightPercentage;
      const smallRadius = radius - arcHeightPercentage !== 0 ? radius - arcHeightPercentage : radius;
      const bigGap = (gap + strokeWidth * 1.25) / orbitNumber / bigRadius;
      const smallGap = (gap + strokeWidth * 1.25) / orbitNumber / smallRadius;
      const upperAngleStart = bigGap - offset;
      const upperAngleEnd = fangle - bigGap - offset;
      const innerAngleStart = smallGap - offset;
      const innerAngleEnd = fangle - smallGap - offset;
      const upperArcStart = this.arcPoint(bigRadius, upperAngleStart);
      const upperArcEnd = this.arcPoint(bigRadius, upperAngleEnd);
      const innerArcStart = this.arcPoint(smallRadius, innerAngleStart);
      const innerArcEnd = this.arcPoint(smallRadius, innerAngleEnd);
      const largeArcFlag = arcAngle <= 180 ? 0 : 1;
      return {
        upperArcStart,
        upperArcEnd,
        innerArcStart,
        innerArcEnd,
        largeArcFlag,
        bigRadius,
        smallRadius,
        radius,
        upperAngleStart,
        upperAngleEnd,
        innerAngleStart,
        innerAngleEnd
      };
    }
    generatePathData(shape, params, arcHeight, orbitNumber) {
      let d = "";
      switch (shape) {
        case "rounded":
          d = this.generateRoundedPath(params, arcHeight, orbitNumber);
          break;
        case "circle":
        case "circle-a":
        case "bullet":
          d = this.generateCirclePath(params, shape);
          break;
        case "circle-b":
          d = this.generateCircleBPath(params, arcHeight, orbitNumber);
          break;
        case "arrow":
          d = this.generateArrowPath(params, orbitNumber);
          break;
        case "backslash":
        case "slash":
          d = this.generateSlashPath(params, shape, orbitNumber);
          break;
        case "zigzag":
          d = this.generateZigzagPath(params, arcHeight, orbitNumber);
          break;
        default:
          d = this.generateDefaultPath(params);
      }
      return d;
    }
    generateRoundedPath(params, arcHeight, orbitNumber) {
      const { upperArcStart, upperArcEnd, innerArcStart, innerArcEnd, bigRadius, smallRadius, largeArcFlag } = params;
      const curve = arcHeight < 10 ? 5 : arcHeight < 5 ? 2.5 : 10;
      const newUpperStart = this.arcPoint(bigRadius, params.upperAngleStart, 0, curve / orbitNumber);
      const newUpperEnd = this.arcPoint(bigRadius, params.upperAngleEnd, 0, -curve / orbitNumber);
      const newInnerStart = this.arcPoint(smallRadius, params.innerAngleStart, 0, curve / orbitNumber);
      const newInnerEnd = this.arcPoint(smallRadius, params.innerAngleEnd, 0, -curve / orbitNumber);
      const upperPointStart = this.arcPoint(bigRadius, params.upperAngleStart, -(curve / 2) / orbitNumber, 0);
      const upperPointEnd = this.arcPoint(bigRadius, params.upperAngleEnd, -(curve / 2) / orbitNumber, 0);
      const innerPointStart = this.arcPoint(smallRadius, params.innerAngleStart, curve / 2 / orbitNumber, 0);
      const innerPointEnd = this.arcPoint(smallRadius, params.innerAngleEnd, curve / 2 / orbitNumber, 0);
      const Q = this.getControlPoint(newUpperEnd.x, newUpperEnd.y, upperPointEnd.x, upperPointEnd.y);
      const Q1 = this.getControlPoint(innerPointEnd.x, innerPointEnd.y, newInnerEnd.x, newInnerEnd.y);
      const Q2 = this.getControlPoint(newInnerStart.x, newInnerStart.y, innerPointStart.x, innerPointStart.y);
      const Q3 = this.getControlPoint(upperPointStart.x, upperPointStart.y, newUpperStart.x, newUpperStart.y);
      let d = `M ${newUpperStart.x},${newUpperStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${newUpperEnd.x},${newUpperEnd.y}`;
      d += `Q ${Q.xc}, ${Q.yc} ${upperPointEnd.x} ${upperPointEnd.y} `;
      d += `L ${upperPointEnd.x} ${upperPointEnd.y}`;
      d += `L ${innerPointEnd.x} ${innerPointEnd.y}`;
      d += `Q ${Q1.xc}, ${Q1.yc} ${newInnerEnd.x} ${newInnerEnd.y} `;
      d += `A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${newInnerStart.x},${newInnerStart.y}`;
      d += `Q ${Q2.xc}, ${Q2.yc} ${innerPointStart.x} ${innerPointStart.y} `;
      d += `L ${innerPointStart.x} ${innerPointStart.y}`;
      d += `L ${upperPointStart.x} ${upperPointStart.y}`;
      d += ` Q ${Q3.xc}, ${Q3.yc} ${newUpperStart.x} ${newUpperStart.y} `;
      d += ` Z`;
      return d;
    }
    // Dentro de la clase OrbitCommon en orbit-common.js
    generateCirclePath(params, shape) {
      const { upperArcStart, upperArcEnd, innerArcStart, innerArcEnd, bigRadius, smallRadius, largeArcFlag } = params;
      let d = `M ${upperArcStart.x},${upperArcStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${upperArcEnd.x},${upperArcEnd.y}`;
      d += ` A 1,1 0 0 1 ${innerArcEnd.x},${innerArcEnd.y} `;
      d += ` A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${innerArcStart.x},${innerArcStart.y}`;
      d += ` A 1,1 0 0 ${shape === "circle" || shape === "circle-a" ? 1 : 0} ${upperArcStart.x},${upperArcStart.y} `;
      d += ` Z`;
      return d;
    }
    generateCircleBPath(params, arcHeight, orbitNumber) {
      const { upperAngleStart, upperAngleEnd, innerAngleStart, innerAngleEnd, bigRadius, smallRadius, largeArcFlag } = params;
      const segment = arcHeight * 1.36;
      const newUpperStart = this.arcPoint(bigRadius, upperAngleStart, 0, segment / orbitNumber);
      const newUpperEnd = this.arcPoint(bigRadius, upperAngleEnd, 0, -segment / orbitNumber);
      const newInnerStart = this.arcPoint(smallRadius, innerAngleStart, 0, segment / orbitNumber);
      const newInnerEnd = this.arcPoint(smallRadius, innerAngleEnd, 0, -segment / orbitNumber);
      let d = `M ${newUpperStart.x},${newUpperStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${newUpperEnd.x},${newUpperEnd.y}`;
      d += ` A 1,1 0 0 1 ${newInnerEnd.x},${newInnerEnd.y} `;
      d += ` A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${newInnerStart.x},${newInnerStart.y}`;
      d += ` A 1,1 0 0 1 ${newUpperStart.x},${newUpperStart.y} `;
      d += ` Z`;
      return d;
    }
    generateArrowPath(params, orbitNumber) {
      const { upperArcStart, upperArcEnd, innerArcStart, innerArcEnd, bigRadius, smallRadius, largeArcFlag, radius } = params;
      const middleEnd = this.arcPoint(radius, params.upperAngleEnd, 0, 24 / orbitNumber / 2);
      const middleStart = this.arcPoint(radius, params.upperAngleStart, 0, 24 / orbitNumber / 2);
      let d = `M ${upperArcStart.x},${upperArcStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${upperArcEnd.x},${upperArcEnd.y}`;
      d += `L ${middleEnd.x} ${middleEnd.y}`;
      d += `L ${innerArcEnd.x} ${innerArcEnd.y}`;
      d += `A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${innerArcStart.x}, ${innerArcStart.y}`;
      d += `L ${middleStart.x} ${middleStart.y}`;
      d += `Z`;
      return d;
    }
    generateSlashPath(params, shape, orbitNumber) {
      const { upperAngleStart, upperAngleEnd, innerAngleStart, innerAngleEnd, bigRadius, smallRadius, largeArcFlag } = params;
      const newUpperStart = this.arcPoint(bigRadius, upperAngleStart, 0, shape === "backslash" ? 0 : 24 / orbitNumber / 2);
      const newUpperEnd = this.arcPoint(bigRadius, upperAngleEnd, 0, shape === "backslash" ? 0 : 24 / orbitNumber / 2);
      const newInnerStart = this.arcPoint(smallRadius, innerAngleStart, 0, shape === "backslash" ? 24 / orbitNumber / 2 : 0);
      const newInnerEnd = this.arcPoint(smallRadius, innerAngleEnd, 0, shape === "backslash" ? 24 / orbitNumber / 2 : 0);
      let d = `M ${newUpperStart.x},${newUpperStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${newUpperEnd.x},${newUpperEnd.y}`;
      d += `L ${newInnerEnd.x} ${newInnerEnd.y}`;
      d += `A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${newInnerStart.x}, ${newInnerStart.y}`;
      d += `Z`;
      return d;
    }
    generateZigzagPath(params, arcHeight, orbitNumber) {
      const { upperArcStart, upperArcEnd, innerArcStart, innerArcEnd, bigRadius, smallRadius, largeArcFlag, radius } = params;
      const s2 = this.arcPoint(radius, params.upperAngleStart, -arcHeight / orbitNumber / 2, 3);
      const s3 = this.arcPoint(radius, params.upperAngleStart, 0 / orbitNumber / 2, 0);
      const s4 = this.arcPoint(radius, params.upperAngleStart, arcHeight / orbitNumber / 2, 3);
      const e2 = this.arcPoint(radius, params.innerAngleEnd, arcHeight / orbitNumber / 2, 3);
      const e3 = this.arcPoint(radius, params.innerAngleEnd, 0 / orbitNumber / 2, 0);
      const e4 = this.arcPoint(radius, params.innerAngleEnd, -arcHeight / orbitNumber / 2, 3);
      let d = `M ${upperArcStart.x},${upperArcStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${upperArcEnd.x},${upperArcEnd.y}`;
      d += `L ${e2.x} ${e2.y}`;
      d += `L ${e3.x} ${e3.y}`;
      d += `L ${e4.x} ${e4.y}`;
      d += `L ${innerArcEnd.x} ${innerArcEnd.y}`;
      d += `A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${innerArcStart.x}, ${innerArcStart.y}`;
      d += `L ${s2.x} ${s2.y}`;
      d += `L ${s3.x} ${s3.y}`;
      d += `L ${s4.x} ${s4.y}`;
      d += `Z`;
      return d;
    }
    generateDefaultPath(params) {
      const { upperArcStart, upperArcEnd, innerArcStart, innerArcEnd, bigRadius, smallRadius, largeArcFlag } = params;
      let d = `M ${upperArcStart.x},${upperArcStart.y} A ${bigRadius},${bigRadius} 0 ${largeArcFlag} 1 ${upperArcEnd.x},${upperArcEnd.y}`;
      d += `L ${innerArcEnd.x} ${innerArcEnd.y}`;
      d += `A ${smallRadius},${smallRadius} 0 ${largeArcFlag} 0 ${innerArcStart.x}, ${innerArcStart.y}`;
      d += `Z`;
      return d;
    }
  };

  // src/js/orbit-progress.js
  var OrbitProgress = class extends OrbitBase {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
      <style>
        :host {
          --o-fill: var(--o-gray-light);
          --o-stroke: var(--o-fill);
          --o-stroke-width: 1;
          --o-back-fill: transparent;
          --o-back-stroke: none;
          --o-back-stroke-width: 1;
        }
        :host(:hover) {
          --o-fill: var(--o-gray-light);
          --o-stroke: var(--o-fill);
          --o-stroke-width: 1;
          --o-back-fill: transparent;
          --o-back-stroke: none;
          --o-back-stroke-width: 1;
        }
        svg {
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
        }
        svg * {
          pointer-events: visiblePainted;
        }
        .progress-bar {
          fill: var(--o-fill);
          stroke: var(--o-stroke);
          stroke-width: var(--o-stroke-width);
          transition: fill 0.25s, stroke 0.25s;
          stroke-linejoin: round;
        }
        .progress-bg {
          fill: var(--o-back-fill);
          stroke: var(--o-back-stroke);
          stroke-width: var(--o-back-stroke-width);
        }
      </style>
      <svg viewBox="0 0 100 100">
        <path class="progress-bg" shape-rendering="geometricPrecision" vector-effect="non-scaling-stroke"></path>
        <path class="progress-bar" shape-rendering="geometricPrecision" vector-effect="non-scaling-stroke"></path>
      </svg>
    `;
    }
    connectedCallback() {
      this.update();
      this.setupObserver();
    }
    setupObserver() {
      this.observer = new MutationObserver((mutations) => {
        this.observer.disconnect();
        mutations.forEach(() => this.update());
        this.observer.observe(this, { attributes: true, childList: true });
      });
      this.observer.observe(this, { attributes: true, childList: true });
    }
    update() {
      const progressBg = this.shadowRoot.querySelector(".progress-bg");
      const progressBar = this.shadowRoot.querySelector(".progress-bar");
      this.updateArc(progressBg, true);
      this.updateArc(progressBar, false);
    }
    updateArc(arc, full) {
      const { d } = this.calculateArcParameters(full);
      arc.setAttribute("d", d);
    }
    getAttributes() {
      const common = super.getCommonAttributes(this);
      const range = parseFloat(getComputedStyle(this).getPropertyValue("--o-range") || 360);
      const progress = parseFloat(getComputedStyle(this).getPropertyValue("--o-progress") || this.getAttribute("value") || 0);
      const maxValue = parseFloat(this.getAttribute("max")) || 100;
      return {
        ...common,
        range,
        progress,
        maxValue
      };
    }
    getProgressAngle(full) {
      const { range, progress, maxValue } = this.getAttributes();
      return full ? (maxValue - 1e-5) / maxValue * range : progress / maxValue * range;
    }
    calculateArcParameters(full) {
      const { shape, realRadius, arcHeightPercentage, orbitNumber, strokeWidth, arcHeight } = this.getAttributes();
      const arcAngle = this.getProgressAngle(full);
      const params = super.calculateCommonArcParameters(
        arcAngle,
        realRadius,
        arcHeightPercentage,
        orbitNumber,
        shape,
        strokeWidth,
        arcHeight
      );
      const d = super.generatePathData(shape, params, arcHeight, orbitNumber);
      return { d };
    }
  };

  // src/js/orbit-arc.js
  var template = document.createElement("template");
  template.innerHTML = `
  <style>
    :host {
      --o-fill: var(--o-gray-light);
      --o-stroke: var(--o-fill);
      --o-stroke-width: 1;
      --o-color: currentcolor;
    }
    :host(:hover) {
      --o-fill: var(--o-gray-light);
      --o-stroke: var(--o-fill);
      --o-stroke-width: 1;
      --o-color: currentcolor;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      pointer-events: none;
    }
    svg * {
      pointer-events: visiblePainted;
    }
    #orbitShape {
      fill: var(--o-fill);
      stroke: var(--o-stroke);
      stroke-width: var(--o-stroke-width);
      transition: fill 0.25s, stroke 0.25s;
    }
    text {
      fill: var(--o-color);
    }
    #orbitPath {
      fill: transparent;
      stroke: none;
      stroke-width: 0;
    }
  </style>
  <svg viewBox="0 0 100 100">
    <path id="orbitShape" shape-rendering="geometricPrecision" vector-effect="non-scaling-stroke"></path>
    <path id="orbitPath" shape-rendering="geometricPrecision" vector-effect="non-scaling-stroke"></path>
    <text>
      <textPath href="#orbitPath" alignment-baseline="middle"></textPath>
    </text>
  </svg>
`;
  var OrbitArc = class extends OrbitBase {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
    connectedCallback() {
      this.update();
      this.setupObservers();
    }
    disconnectedCallback() {
      this.observer?.disconnect();
      this.textObserver?.disconnect();
    }
    setupObservers() {
      this.observer = new MutationObserver((mutations) => {
        this.observer.disconnect();
        mutations.forEach(() => this.update());
        this.observer.observe(this, { attributes: true, childList: true });
      });
      this.observer.observe(this, { attributes: true, childList: true });
      this.textObserver = new MutationObserver(() => {
        const textPath = this.shadowRoot.querySelector("textPath");
        textPath.textContent = this.textContent;
      });
      this.textObserver.observe(this, { characterData: true, subtree: true });
    }
    update() {
      const { length, fontSize, textAnchor, fitRange } = this.getAttributes();
      const orbitPath = this.shadowRoot.getElementById("orbitPath");
      const orbitShape = this.shadowRoot.getElementById("orbitShape");
      const text = this.shadowRoot.querySelector("text");
      const textPath = this.shadowRoot.querySelector("textPath");
      const { dShape } = this.calculateArcParameters();
      const { dPath } = this.calculateTextArcParameters();
      orbitShape.setAttribute("d", dShape);
      orbitPath.setAttribute("d", dPath);
      if (textAnchor === "start") {
        textPath.setAttribute("startOffset", "0%");
        textPath.setAttribute("text-anchor", "start");
      } else if (textAnchor === "middle") {
        textPath.setAttribute("startOffset", "50%");
        textPath.setAttribute("text-anchor", "middle");
      } else if (textAnchor === "end") {
        textPath.setAttribute("startOffset", "100%");
        textPath.setAttribute("text-anchor", "end");
      }
      if (fitRange) {
        textPath.parentElement.setAttribute("textLength", orbitPath.getTotalLength());
      }
      text.style.fontSize = `calc(${fontSize} * (100 / (${length}) * (12 / var(--o-orbit-number)))`;
      textPath.textContent = this.textContent;
    }
    getAttributes() {
      const common = super.getCommonAttributes(this);
      let arcAngle;
      const flip = this.hasAttribute("flip") || this.classList.contains("flip");
      const fitRange = this.hasAttribute("fit-range") || this.classList.contains("fit-range") || false;
      const length = parseFloat(getComputedStyle(this).getPropertyValue("--o-force"));
      const textAnchor = this.getAttribute("text-anchor") || "middle";
      const fontSize = getComputedStyle(this).getPropertyValue("font-size") || getComputedStyle(this).getPropertyValue("--font-size");
      const range = parseFloat(getComputedStyle(this).getPropertyValue("--o-range") || 360);
      const value = parseFloat(this.getAttribute("value"));
      const gap = parseFloat(getComputedStyle(this).getPropertyValue("--o-gap"));
      if (value) {
        arcAngle = super.getProgressAngle(range, value);
        const prevElement = this.previousElementSibling;
        const stackOffset = prevElement ? parseFloat(getComputedStyle(prevElement).getPropertyValue("--o_stack")) : 0;
        this.style.setProperty("--o_stack", stackOffset + arcAngle);
        if (stackOffset >= 0 && flip) {
          this.style.setProperty("--o-angle-composite", parseFloat(stackOffset) + "deg");
        }
        if (stackOffset > 0 && !flip) {
          this.style.setProperty("--o-angle-composite", parseFloat(stackOffset) + "deg");
        }
      } else {
        const rawAngle = getComputedStyle(this).getPropertyValue("--o-angle");
        arcAngle = this.calcularExpresionCSS(rawAngle);
      }
      return {
        ...common,
        gap,
        arcAngle,
        flip,
        fitRange,
        length,
        fontSize,
        textAnchor
      };
    }
    calculateArcParameters() {
      const { arcAngle, realRadius, arcHeightPercentage, orbitNumber, shape, strokeWidth, arcHeight, gap } = this.getAttributes();
      const params = super.calculateCommonArcParameters(
        arcAngle,
        realRadius,
        arcHeightPercentage,
        orbitNumber,
        shape,
        strokeWidth,
        arcHeight,
        gap
      );
      const dShape = super.generatePathData(shape, params, arcHeight, orbitNumber);
      return { dShape };
    }
    calculateTextArcParameters() {
      const { arcAngle, realRadius, gap, flip } = this.getAttributes();
      const adjustedGap = gap * 0.5;
      const sweepFlag = flip ? 0 : 1;
      const largeArcFlag = arcAngle <= 180 ? 0 : 1;
      let coordX1 = 50 + realRadius * Math.cos((-90 + adjustedGap) * (Math.PI / 180));
      let coordY1 = 50 + realRadius * Math.sin((-90 + adjustedGap) * (Math.PI / 180));
      let coordX2 = 50 + realRadius * Math.cos((arcAngle - 90 - adjustedGap) * Math.PI / 180);
      let coordY2 = 50 + realRadius * Math.sin((arcAngle - 90 - adjustedGap) * Math.PI / 180);
      const [startX, startY, endX, endY] = flip ? [coordX2, coordY2, coordX1, coordY1] : [coordX1, coordY1, coordX2, coordY2];
      const dPath = `M ${startX},${startY} A ${realRadius},${realRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX},${endY}`;
      return { dPath };
    }
    calcularExpresionCSS(cssExpression) {
      const match = cssExpression.match(/calc\(\s*([\d.]+)deg\s*\/\s*\(\s*(\d+)\s*-\s*(\d+)\s*\)\s*\)/);
      if (match) {
        const value = parseFloat(match[1]);
        const divisor = parseInt(match[2]) - parseInt(match[3]);
        if (!isNaN(value) && !isNaN(divisor) && divisor !== 0) {
          return value / divisor;
        }
      }
      return 0;
    }
  };

  // src/js/orbit-resize.js
  var Orbit = {};
  Orbit = {
    resize: (parentElementSelector) => {
      const parentElement = document.querySelector(parentElementSelector);
      if (!parentElement) {
        console.error(`Not found: ${parentElementSelector}`);
        return;
      }
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width } = entry.contentRect;
          const childElements = parentElement.querySelectorAll(".gravity-spot");
          if (childElements) {
            childElements.forEach((childElement) => {
              let gravityForce = getComputedStyle(childElement).getPropertyValue("--o-force");
              let forceRatio = width / 500;
              childElement.style.setProperty("--o-force-ratio", `${forceRatio}`);
            });
          } else {
            console.error("No gravity-spot found");
          }
        }
      });
      resizeObserver.observe(parentElement);
    }
  };

  // src/orbit.js
  if (!customElements.get("o-progress")) {
    customElements.define("o-progress", OrbitProgress);
  }
  if (!customElements.get("o-arc")) {
    customElements.define("o-arc", OrbitArc);
  }
  window.Orbit = Orbit;
})();
