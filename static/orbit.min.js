(()=>{var f=class extends HTMLElement{constructor(){super(),this.commonProperties={orbitRadius:0,arcHeight:0,realRadius:0,arcAngle:0,shape:"none",arcHeightPercentage:0,orbitNumber:1,size:1,strokeWidth:1}}getCommonAttributes(t){let e=parseFloat(getComputedStyle(t).getPropertyValue("r")||0),r=parseFloat(getComputedStyle(t).getPropertyValue("--o-orbit-number")||1),n=parseFloat(getComputedStyle(t).getPropertyValue("--o-size-ratio")||1),a=parseFloat(getComputedStyle(t).getPropertyValue("--o-stroke-width")||1),i=t.getAttribute("shape")||"none",l=e/r*n-a+.3,s=l/2*100/e/2,o=0;t.classList.contains("outer-orbit")?o=s:t.classList.contains("quarter-outer-orbit")?o=s*-.5:t.classList.contains("inner-orbit")?o=s*-1:t.classList.contains("quarter-inner-orbit")&&(o=s*.5);let h=50+o;return{orbitRadius:e,arcHeight:l,realRadius:h,arcAngle:0,shape:i,arcHeightPercentage:s,orbitNumber:r,size:n,strokeWidth:a}}getProgressAngle(t,e,r=100){return e/r*t}getControlPoint(t,e,r,n,a="clockwise"){let i=(t+r)/2,l=(e+n)/2,s=r-t,o=n-e;return a==="clockwise"?{xc:i+o*.4,yc:l-s*.4}:{xc:i-o*.4,yc:l+s*.4}}arcPoint(t,e,r=0,n=0){let a=t+r,i=e+n*Math.PI/180;return{x:50+a*Math.cos(i),y:50+a*Math.sin(i)}}calculateCommonArcParameters(t,e,r,n,a,i,l,s=0){let o=Math.PI/2,h=t*Math.PI/180,c=e+r,g=e-r!==0?e-r:e,d=(s+i*1.25)/n/c,$=(s+i*1.25)/n/g,u=d-o,A=h-d-o,y=$-o,p=h-$-o,x=this.arcPoint(c,u),v=this.arcPoint(c,A),S=this.arcPoint(g,y),k=this.arcPoint(g,p),w=t<=180?0:1;return{upperArcStart:x,upperArcEnd:v,innerArcStart:S,innerArcEnd:k,largeArcFlag:w,bigRadius:c,smallRadius:g,radius:e,upperAngleStart:u,upperAngleEnd:A,innerAngleStart:y,innerAngleEnd:p}}generatePathData(t,e,r,n){let a="";switch(t){case"rounded":a=this.generateRoundedPath(e,r,n);break;case"circle":case"circle-a":case"bullet":a=this.generateCirclePath(e,t);break;case"circle-b":a=this.generateCircleBPath(e,r,n);break;case"arrow":a=this.generateArrowPath(e,n);break;case"backslash":case"slash":a=this.generateSlashPath(e,t,n);break;case"zigzag":a=this.generateZigzagPath(e,r,n);break;default:a=this.generateDefaultPath(e)}return a}generateRoundedPath(t,e,r){let{upperArcStart:n,upperArcEnd:a,innerArcStart:i,innerArcEnd:l,bigRadius:s,smallRadius:o,largeArcFlag:h}=t,c=e<10?5:e<5?2.5:10,g=this.arcPoint(s,t.upperAngleStart,0,c/r),d=this.arcPoint(s,t.upperAngleEnd,0,-c/r),$=this.arcPoint(o,t.innerAngleStart,0,c/r),u=this.arcPoint(o,t.innerAngleEnd,0,-c/r),A=this.arcPoint(s,t.upperAngleStart,-(c/2)/r,0),y=this.arcPoint(s,t.upperAngleEnd,-(c/2)/r,0),p=this.arcPoint(o,t.innerAngleStart,c/2/r,0),x=this.arcPoint(o,t.innerAngleEnd,c/2/r,0),v=this.getControlPoint(d.x,d.y,y.x,y.y),S=this.getControlPoint(x.x,x.y,u.x,u.y),k=this.getControlPoint($.x,$.y,p.x,p.y),w=this.getControlPoint(A.x,A.y,g.x,g.y),P=`M ${g.x},${g.y} A ${s},${s} 0 ${h} 1 ${d.x},${d.y}`;return P+=`Q ${v.xc}, ${v.yc} ${y.x} ${y.y} `,P+=`L ${y.x} ${y.y}`,P+=`L ${x.x} ${x.y}`,P+=`Q ${S.xc}, ${S.yc} ${u.x} ${u.y} `,P+=`A ${o},${o} 0 ${h} 0 ${$.x},${$.y}`,P+=`Q ${k.xc}, ${k.yc} ${p.x} ${p.y} `,P+=`L ${p.x} ${p.y}`,P+=`L ${A.x} ${A.y}`,P+=` Q ${w.xc}, ${w.yc} ${g.x} ${g.y} `,P+=" Z",P}generateCirclePath(t,e){let{upperArcStart:r,upperArcEnd:n,innerArcStart:a,innerArcEnd:i,bigRadius:l,smallRadius:s,largeArcFlag:o}=t,h=`M ${r.x},${r.y} A ${l},${l} 0 ${o} 1 ${n.x},${n.y}`;return h+=` A 1,1 0 0 1 ${i.x},${i.y} `,h+=` A ${s},${s} 0 ${o} 0 ${a.x},${a.y}`,h+=` A 1,1 0 0 ${e==="circle"||e==="circle-a"?1:0} ${r.x},${r.y} `,h+=" Z",h}generateCircleBPath(t,e,r){let{upperAngleStart:n,upperAngleEnd:a,innerAngleStart:i,innerAngleEnd:l,bigRadius:s,smallRadius:o,largeArcFlag:h}=t,c=e*1.36,g=this.arcPoint(s,n,0,c/r),d=this.arcPoint(s,a,0,-c/r),$=this.arcPoint(o,i,0,c/r),u=this.arcPoint(o,l,0,-c/r),A=`M ${g.x},${g.y} A ${s},${s} 0 ${h} 1 ${d.x},${d.y}`;return A+=` A 1,1 0 0 1 ${u.x},${u.y} `,A+=` A ${o},${o} 0 ${h} 0 ${$.x},${$.y}`,A+=` A 1,1 0 0 1 ${g.x},${g.y} `,A+=" Z",A}generateArrowPath(t,e){let{upperArcStart:r,upperArcEnd:n,innerArcStart:a,innerArcEnd:i,bigRadius:l,smallRadius:s,largeArcFlag:o,radius:h}=t,c=this.arcPoint(h,t.upperAngleEnd,0,24/e/2),g=this.arcPoint(h,t.upperAngleStart,0,24/e/2),d=`M ${r.x},${r.y} A ${l},${l} 0 ${o} 1 ${n.x},${n.y}`;return d+=`L ${c.x} ${c.y}`,d+=`L ${i.x} ${i.y}`,d+=`A ${s},${s} 0 ${o} 0 ${a.x}, ${a.y}`,d+=`L ${g.x} ${g.y}`,d+="Z",d}generateSlashPath(t,e,r){let{upperAngleStart:n,upperAngleEnd:a,innerAngleStart:i,innerAngleEnd:l,bigRadius:s,smallRadius:o,largeArcFlag:h}=t,c=this.arcPoint(s,n,0,e==="backslash"?0:24/r/2),g=this.arcPoint(s,a,0,e==="backslash"?0:24/r/2),d=this.arcPoint(o,i,0,e==="backslash"?24/r/2:0),$=this.arcPoint(o,l,0,e==="backslash"?24/r/2:0),u=`M ${c.x},${c.y} A ${s},${s} 0 ${h} 1 ${g.x},${g.y}`;return u+=`L ${$.x} ${$.y}`,u+=`A ${o},${o} 0 ${h} 0 ${d.x}, ${d.y}`,u+="Z",u}generateZigzagPath(t,e,r){let{upperArcStart:n,upperArcEnd:a,innerArcStart:i,innerArcEnd:l,bigRadius:s,smallRadius:o,largeArcFlag:h,radius:c}=t,g=this.arcPoint(c,t.upperAngleStart,-e/r/2,3),d=this.arcPoint(c,t.upperAngleStart,0/r/2,0),$=this.arcPoint(c,t.upperAngleStart,e/r/2,3),u=this.arcPoint(c,t.innerAngleEnd,e/r/2,3),A=this.arcPoint(c,t.innerAngleEnd,0/r/2,0),y=this.arcPoint(c,t.innerAngleEnd,-e/r/2,3),p=`M ${n.x},${n.y} A ${s},${s} 0 ${h} 1 ${a.x},${a.y}`;return p+=`L ${u.x} ${u.y}`,p+=`L ${A.x} ${A.y}`,p+=`L ${y.x} ${y.y}`,p+=`L ${l.x} ${l.y}`,p+=`A ${o},${o} 0 ${h} 0 ${i.x}, ${i.y}`,p+=`L ${g.x} ${g.y}`,p+=`L ${d.x} ${d.y}`,p+=`L ${$.x} ${$.y}`,p+="Z",p}generateDefaultPath(t){let{upperArcStart:e,upperArcEnd:r,innerArcStart:n,innerArcEnd:a,bigRadius:i,smallRadius:l,largeArcFlag:s}=t,o=`M ${e.x},${e.y} A ${i},${i} 0 ${s} 1 ${r.x},${r.y}`;return o+=`L ${a.x} ${a.y}`,o+=`A ${l},${l} 0 ${s} 0 ${n.x}, ${n.y}`,o+="Z",o}};var m=class extends f{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=`
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
    `}connectedCallback(){this.update(),this.setupObserver()}setupObserver(){this.observer=new MutationObserver(t=>{this.observer.disconnect(),t.forEach(()=>this.update()),this.observer.observe(this,{attributes:!0,childList:!0})}),this.observer.observe(this,{attributes:!0,childList:!0})}update(){let t=this.shadowRoot.querySelector(".progress-bg"),e=this.shadowRoot.querySelector(".progress-bar");this.updateArc(t,!0),this.updateArc(e,!1)}updateArc(t,e){let{d:r}=this.calculateArcParameters(e);t.setAttribute("d",r)}getAttributes(){let t=super.getCommonAttributes(this),e=parseFloat(getComputedStyle(this).getPropertyValue("--o-range")||360),r=parseFloat(getComputedStyle(this).getPropertyValue("--o-progress")||this.getAttribute("value")||0),n=parseFloat(this.getAttribute("max"))||100;return{...t,range:e,progress:r,maxValue:n}}getProgressAngle(t){let{range:e,progress:r,maxValue:n}=this.getAttributes();return t?(n-1e-5)/n*e:r/n*e}calculateArcParameters(t){let{shape:e,realRadius:r,arcHeightPercentage:n,orbitNumber:a,strokeWidth:i,arcHeight:l}=this.getAttributes(),s=this.getProgressAngle(t),o=super.calculateCommonArcParameters(s,r,n,a,e,i,l);return{d:super.generatePathData(e,o,l,a)}}};var C=document.createElement("template");C.innerHTML=`
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
`;var E=class extends f{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(C.content.cloneNode(!0))}connectedCallback(){this.update(),this.setupObservers()}disconnectedCallback(){this.observer?.disconnect(),this.textObserver?.disconnect()}setupObservers(){this.observer=new MutationObserver(t=>{this.observer.disconnect(),t.forEach(()=>this.update()),this.observer.observe(this,{attributes:!0,childList:!0})}),this.observer.observe(this,{attributes:!0,childList:!0}),this.textObserver=new MutationObserver(()=>{let t=this.shadowRoot.querySelector("textPath");t.textContent=this.textContent}),this.textObserver.observe(this,{characterData:!0,subtree:!0})}update(){let{length:t,fontSize:e,textAnchor:r,fitRange:n}=this.getAttributes(),a=this.shadowRoot.getElementById("orbitPath"),i=this.shadowRoot.getElementById("orbitShape"),l=this.shadowRoot.querySelector("text"),s=this.shadowRoot.querySelector("textPath"),{dShape:o}=this.calculateArcParameters(),{dPath:h}=this.calculateTextArcParameters();i.setAttribute("d",o),a.setAttribute("d",h),r==="start"?(s.setAttribute("startOffset","0%"),s.setAttribute("text-anchor","start")):r==="middle"?(s.setAttribute("startOffset","50%"),s.setAttribute("text-anchor","middle")):r==="end"&&(s.setAttribute("startOffset","100%"),s.setAttribute("text-anchor","end")),n&&s.parentElement.setAttribute("textLength",a.getTotalLength()),l.style.fontSize=`calc(${e} * (100 / (${t}) * (12 / var(--o-orbit-number)))`,s.textContent=this.textContent}getAttributes(){let t=super.getCommonAttributes(this),e,r=this.hasAttribute("flip")||this.classList.contains("flip"),n=this.hasAttribute("fit-range")||this.classList.contains("fit-range")||!1,a=parseFloat(getComputedStyle(this).getPropertyValue("--o-force")),i=this.getAttribute("text-anchor")||"middle",l=getComputedStyle(this).getPropertyValue("font-size")||getComputedStyle(this).getPropertyValue("--font-size"),s=parseFloat(getComputedStyle(this).getPropertyValue("--o-range")||360),o=parseFloat(this.getAttribute("value")),h=parseFloat(getComputedStyle(this).getPropertyValue("--o-gap"));if(o){e=super.getProgressAngle(s,o);let c=this.previousElementSibling,g=c?parseFloat(getComputedStyle(c).getPropertyValue("--o_stack")):0;this.style.setProperty("--o_stack",g+e),g>=0&&r&&this.style.setProperty("--o-angle-composite",parseFloat(g)+"deg"),g>0&&!r&&this.style.setProperty("--o-angle-composite",parseFloat(g)+"deg")}else{let c=getComputedStyle(this).getPropertyValue("--o-angle");e=this.calcularExpresionCSS(c)}return{...t,gap:h,arcAngle:e,flip:r,fitRange:n,length:a,fontSize:l,textAnchor:i}}calculateArcParameters(){let{arcAngle:t,realRadius:e,arcHeightPercentage:r,orbitNumber:n,shape:a,strokeWidth:i,arcHeight:l,gap:s}=this.getAttributes(),o=super.calculateCommonArcParameters(t,e,r,n,a,i,l,s);return{dShape:super.generatePathData(a,o,l,n)}}calculateTextArcParameters(){let{arcAngle:t,realRadius:e,gap:r,flip:n}=this.getAttributes(),a=r*.5,i=n?0:1,l=t<=180?0:1,s=50+e*Math.cos((-90+a)*(Math.PI/180)),o=50+e*Math.sin((-90+a)*(Math.PI/180)),h=50+e*Math.cos((t-90-a)*Math.PI/180),c=50+e*Math.sin((t-90-a)*Math.PI/180),[g,d,$,u]=n?[h,c,s,o]:[s,o,h,c];return{dPath:`M ${g},${d} A ${e},${e} 0 ${l} ${i} ${$},${u}`}}calcularExpresionCSS(t){let e=t.match(/calc\(\s*([\d.]+)deg\s*\/\s*\(\s*(\d+)\s*-\s*(\d+)\s*\)\s*\)/);if(e){let r=parseFloat(e[1]),n=parseInt(e[2])-parseInt(e[3]);if(!isNaN(r)&&!isNaN(n)&&n!==0)return r/n}return 0}};var R={};R={resize:b=>{let t=document.querySelector(b);if(!t){console.error(`Not found: ${b}`);return}new ResizeObserver(r=>{for(let n of r){let{width:a}=n.contentRect,i=t.querySelectorAll(".gravity-spot");i?i.forEach(l=>{let s=getComputedStyle(l).getPropertyValue("--o-force"),o=a/500;l.style.setProperty("--o-force-ratio",`${o}`)}):console.error("No gravity-spot found")}}).observe(t)}};customElements.get("o-progress")||customElements.define("o-progress",m);customElements.get("o-arc")||customElements.define("o-arc",E);window.Orbit=R;})();
