import React from 'react'
export default ({ stroke='#000000', strokeWidth='36', }) => <svg
  viewBox="0 0 600 600"
  version="1.1"
  width="600"
  height="600"
  stroke={stroke}
>
  <path
    d="M 65.146443,128.25541 V 268.9714 c 0,16.00116 6.76814,31.34343 18.89018,42.63836 L 261.8265,477.26872 c 25.25424,23.53111 66.16611,23.53111 91.42036,0 L 488.10452,351.61263 c 25.25423,-23.53109 25.25423,-61.65148 0,-85.18259 L 310.31465,100.77108 C 298.19261,89.476152 281.72685,83.169822 264.55396,83.169822 H 113.6346 C 86.865098,83.075722 65.146443,103.31244 65.146443,128.25541 Z"
    style={{
      strokeWidth,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-dasharray': 'none',
    }}
    />
</svg>
