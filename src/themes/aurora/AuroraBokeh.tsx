import './aurora.css';

const BLOBS: Array<{
  left: string;
  top: string;
  size: number;
  color: string;
  anim: string;
  dur: string;
  delay: string;
}> = [
  { left: '5%',  top: '20%', size: 320, color: 'rgba(180,20,60,0.18)',   anim: 'aurora-drift1', dur: '8s',  delay: '0s'    },
  { left: '15%', top: '65%', size: 220, color: 'rgba(220,30,80,0.14)',   anim: 'aurora-drift2', dur: '12s', delay: '-3s'   },
  { left: '38%', top: '8%',  size: 420, color: 'rgba(160,10,40,0.12)',   anim: 'aurora-drift3', dur: '15s', delay: '-6s'   },
  { left: '58%', top: '70%', size: 260, color: 'rgba(200,40,100,0.14)',  anim: 'aurora-drift1', dur: '10s', delay: '-4s'   },
  { left: '78%', top: '25%', size: 370, color: 'rgba(180,20,60,0.16)',   anim: 'aurora-drift2', dur: '9s',  delay: '-1.5s' },
  { left: '88%', top: '72%', size: 210, color: 'rgba(240,60,120,0.12)',  anim: 'aurora-drift3', dur: '14s', delay: '-7s'   },
  { left: '48%', top: '45%', size: 520, color: 'rgba(140,5,30,0.08)',    anim: 'aurora-drift1', dur: '20s', delay: '-10s'  },
];

export function AuroraBokeh() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        contain: 'layout style paint',
        zIndex: 0,
      }}
    >
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: blob.left,
            top: blob.top,
            width: blob.size,
            height: blob.size,
            borderRadius: '50%',
            background: blob.color,
            filter: 'blur(70px)',
            animation: `${blob.anim} ${blob.dur} ease-in-out ${blob.delay} infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
