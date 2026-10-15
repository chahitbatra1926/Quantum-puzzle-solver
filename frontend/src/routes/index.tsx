import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Crown, Flame, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Achievements, PageHeading } from '@/components/arena/shell';
import { useProgress } from '@/components/arena/progress-context';
import { pageMeta } from '@/lib/arena/meta';
import queenArt from '@/assets/queens-arena.jpg';
import bagArt from '@/assets/knapsack.jpg';

export const Route=createFileRoute('/')({head:()=>pageMeta('Your puzzle command center','Explore N-Queens and Knapsack, predict algorithm winners, and discover the art of optimization in Qubit Arena.'),component:Overview});

function Overview(){
  const {runs}=useProgress();
  return (
    <>
      <PageHeading eyebrow="A LITTLE CURIOSITY. LIMITLESS POSSIBILITIES." title="Welcome back, Alex." description="Your next breakthrough starts with a better question.">
        <span className="tag header-badge"><Flame size={12} className="text-gold"/> READY FOR YOUR NEXT SPARK</span>
      </PageHeading>
      
      <div className="feature-grid">
        <section className="featured-stage">
          <img src={queenArt} width={1536} height={1024} alt="A sculptural lime glass queen on a graphite chessboard"/>
          <span className="stage-number">FEATURED PUZZLE / 01</span>
          <div className="feature-copy">
            <span className="tag tag-acid"><Sparkles size={11}/> THE STRATEGY CLASSIC</span>
            <h2>N-QUEENS.<br/>NO ROOM FOR<br/><span>CONFLICT.</span></h2>
            <p>One board. Eight queens. Three solvers.<br/>Different paths to the perfect arrangement.</p>
            <div className="feature-actions">
              <Button asChild><Link to="/arena" search={{puzzle:'queens',size:8,seed:19472}}><SwordsIcon/> Enter the arena <ArrowUpRight/></Link></Button>
              <Button variant="outline" size="icon" asChild><Link to="/learn" aria-label="Learn about N-Queens" title="Learn about N-Queens"><BookIcon/></Link></Button>
            </div>
          </div>
          <div className="feature-bottom"><span className="tag">N = 4–12</span><span className="tag">3 SOLVERS</span></div>
        </section>
        
        <aside className="mission-card">
          <div className="flex items-center justify-between"><span className="eyebrow text-primary">DAILY CHALLENGE</span><Target size={16} className="text-primary"/></div>
          <Target className="mission-watermark"/>
          <h3>Eight queens.<br/>One bold prediction.</h3>
          <p>Which search strategy will find harmony first? Trust your intuition, then test it.</p>
          <div className="mission-reward"><Zap size={14}/> UP TO +30 XP <span className="text-muted-foreground text-[9px]">/ RUN</span></div>
          <div className="mission-bottom">
            <div className="flex items-center justify-between mb-4 text-[9px] text-muted-foreground"><span>DIFFICULTY</span><span className="text-gold">● ● ● ○ ○</span></div>
            <Button asChild variant="outline" className="w-full"><Link to="/challenges">Accept the challenge <ArrowRight/></Link></Button>
          </div>
        </aside>
      </div>
      
      <div className="section-heading"><h2>Pick your playground <small>03 ACTIVE PUZZLES</small></h2><Button asChild variant="link" className="text-[10px]"><Link to="/arena" search={{puzzle:'queens',size:8,seed:19472}}>Explore arena <ArrowUpRight/></Link></Button></div>
      
      <div className="puzzle-grid">
        <Link to="/arena" search={{puzzle:'queens',size:8,seed:19472}} className="puzzle-card">
          <div className="puzzle-art"><img loading="lazy" src={queenArt} width={1536} height={1024} alt="Lime glass chess queens"/><span className="tag tag-acid">CONSTRAINT SATISFACTION</span></div>
          <div className="puzzle-info">
            <h3>N-Queens</h3><p>A little space. A lot of possibilities.</p>
            <div className="puzzle-meta"><span>4–12 QUEENS <span className="mx-2">·</span> 3 SOLVERS</span><span className="puzzle-link-arrow"><ArrowUpRight size={13}/></span></div>
          </div>
        </Link>
        
        <Link to="/arena" search={{puzzle:'knapsack',size:8,seed:19472}} className="puzzle-card">
          <div className="puzzle-art"><img loading="lazy" src={bagArt} width={1024} height={768} alt="Lavender backpack with silver cubes and pink gems"/><span className="tag text-lilac">COMBINATORIAL OPTIMIZATION</span></div>
          <div className="puzzle-info">
            <h3>0/1 Knapsack</h3><p>Pack smarter. Make every choice count.</p>
            <div className="puzzle-meta"><span>8 ITEMS <span className="mx-2">·</span> 3 SOLVERS</span><span className="puzzle-link-arrow"><ArrowUpRight size={13}/></span></div>
          </div>
        </Link>
        
        <Link to="/arena" search={{puzzle:'sudoku',size:4,seed:42}} className="puzzle-card">
          <div className="puzzle-art">
            <div className="sudoku-art" aria-hidden="true">{['3','','7','2','','5','','','9','4','','1','','','6',''].map((n,i)=><span key={i}>{n}</span>)}</div>
            <span className="tag">LOGIC & DEDUCTION</span>
          </div>
          <div className="puzzle-info">
            <h3>Sudoku</h3><p>Every number has a place. Find it.</p>
            <div className="puzzle-meta"><span>4×4 GRID <span className="mx-2">·</span> 3 SOLVERS</span><span className="puzzle-link-arrow"><ArrowUpRight size={13}/></span></div>
          </div>
        </Link>
      </div>
      
      <div className="bottom-grid">
        <section>
          <div className="section-heading"><h2>Your recent experiments</h2><span className="eyebrow">{runs.length?'THIS SESSION':'SAMPLE ACTIVITY'}</span></div>
          <table className="activity-table">
            <thead><tr><th>PUZZLE</th><th>LEADING SOLVER</th><th className="hide-mobile">SEARCH STEPS</th><th>RESULT</th></tr></thead>
            <tbody>
              {(runs.length?runs.slice(0,3):[{puzzle:'N-Queens · 8 × 8',solver:'Min-conflicts',iterations:42,correct:true,seed:19472},{puzzle:'0/1 Knapsack',solver:'Exact search',iterations:256,correct:true,seed:7},{puzzle:'N-Queens · 6 × 6',solver:'Annealing',iterations:128,correct:false,seed:9}]).map((r,i)=>
                <tr key={i}><td className="font-medium">{r.puzzle}</td><td><span className={`solver-dot ${r.solver==='Annealing'?'text-primary':r.solver==='Exact search'?'text-cyan':'text-lilac'}`}/>{r.solver}</td><td className="hide-mobile text-muted-foreground font-mono">{r.iterations}</td><td className="text-primary font-mono text-[9px]">COMPLETE <span className="text-muted-foreground ml-2">↗</span></td></tr>
              )}
            </tbody>
          </table>
        </section>
        
        <section>
          <div className="section-heading"><h2>Small wins. Big energy.</h2><Button variant="link" asChild className="text-[10px]"><Link to="/profile">Your progress <ArrowUpRight/></Link></Button></div>
          <Achievements/>
        </section>
      </div>
    </>
  );
}

function SwordsIcon(){return <Zap size={15}/>;} 
function BookIcon(){return <Crown size={16}/>;}