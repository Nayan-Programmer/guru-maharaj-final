import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronDown, ChevronUp, CircleHelp, CircleDot, Droplets, Edit3,
  Expand, LayoutGrid, Lamp, ListRestart, LockKeyhole, Plus, Sparkles, TreePine,
  Flame, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Trash2, Trophy,
  Unlock, Volume2, VolumeX, X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { TugOfWar } from '@/components/tug-of-war';
import { defaultTugOfWarSettings, initialQuestionBank, type QuizDifficulty, type QuizQuestion, type TugOfWarSettings } from '@/lib/quiz-data';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

type GuruEntry = { id: string; image: string; name: string; subtitle: string; order: number };
type Question = QuizQuestion;
type ScoreHistory = {
  id: string; questionIndex: number; className: string; points: number; at: string;
  action?: string; previousScore?: number; newScore?: number;
};
type Competition = {
  questionIndex: number; gameStatus: 'idle' | 'active' | 'paused' | 'finished'; timer: number;
  scores: Record<string, number>; scoreHistory: ScoreHistory[]; soundEnabled: boolean;
};

const asset = (name: string) => `/guru-assets/${name}`;
const portraits: GuruEntry[] = [
  { id: 'guru-maharaj', image: asset('guru-maharaj.jpg'), name: 'Guru Maharaj', subtitle: 'Official visit portrait', order: 1 },
];
const classNames = ['CLASS 3', 'CLASS 4', 'CLASS 5', 'CLASS 6', 'CLASS 7'];
const initialQuestions: Question[] = initialQuestionBank;
const defaultCompetition: Competition = {
  questionIndex: 0,
  gameStatus: 'idle',
  timer: 15,
  scores: Object.fromEntries(classNames.map((name) => [name, 0])),
  scoreHistory: [],
  soundEnabled: true,
};

function readStore<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch { return fallback; }
}
function writeStore<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* offline fallback */ }
}
function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStore(key, fallback));
  useEffect(() => { writeStore(key, value); }, [key, value]);
  return [value, setValue] as const;
}

const CORRECT_ANSWER_SOUND = asset('correct-answer.mp3');
const WRONG_ANSWER_SOUND = asset('wrong-answer.mp3');
const BACKGROUND_MUSIC_SRC = asset('quiz-tug-of-war-bg.m4a');

let backgroundMusicEl: HTMLAudioElement | null = null;
function getBackgroundMusic() {
  if (typeof window === 'undefined') return null;
  if (!backgroundMusicEl) {
    backgroundMusicEl = new Audio(BACKGROUND_MUSIC_SRC);
    backgroundMusicEl.loop = true;
    backgroundMusicEl.volume = 0.32;
  }
  return backgroundMusicEl;
}
function setBackgroundMusic(enabled: boolean, shouldPlay: boolean) {
  const music = getBackgroundMusic();
  if (!music) return;
  if (enabled && shouldPlay) {
    void music.play().catch(() => { /* browser may block autoplay until a touch happens */ });
  } else {
    music.pause();
  }
}

function playTone(enabled: boolean, tone: 'tap' | 'correct' | 'wrong' | 'finish') {
  if (!enabled || typeof window === 'undefined') return;
  if (tone === 'correct' || tone === 'wrong') {
    try {
      const clip = new Audio(tone === 'correct' ? CORRECT_ANSWER_SOUND : WRONG_ANSWER_SOUND);
      clip.volume = 0.85;
      void clip.play().catch(() => { /* the visual feedback still shows if audio is blocked */ });
      return;
    } catch { /* fall through to the synthesized tone below */ }
  }
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone === 'wrong' ? 'sine' : 'triangle';
    oscillator.frequency.value = tone === 'correct' ? 620 : tone === 'finish' ? 440 : tone === 'wrong' ? 170 : 320;
    gain.gain.setValueAtTime(.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + (tone === 'finish' ? .8 : .18));
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .8);
  } catch { /* audio is an optional enhancement */ }
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [, setPageState] = useLocalState('guru-current-page', location);
  const [sound, setSound] = useLocalState('guru-sound-enabled', true);
  useEffect(() => setPageState(location), [location, setPageState]);
  useEffect(() => {
    // Tug of War manages its own background-music instance internally, so it's excluded here.
    const musicPages = ['/game', '/vault'];
    setBackgroundMusic(sound, musicPages.includes(location));
  }, [location, sound]);
  useEffect(() => () => setBackgroundMusic(false, false), []);
  const fullscreen = () => document.documentElement.requestFullscreen?.();
  return (
    <div className="app-shell">
      <div className="page-wrap">
        <header className="topbar">
          <Link href="/" className="brand" data-testid="link-home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-copy"><span className="brand-title">Gurukul Guru Maharaj Visit 2026</span><span className="brand-sub">15 September 2026 · Touchscreen Darshan</span></span>
          </Link>
          <nav className="nav" aria-label="Main navigation">
            <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`} data-testid="link-gallery">Gallery</Link>
            <Link href="/game" className={`nav-link ${location === '/game' ? 'active' : ''}`} data-testid="link-game">Play</Link>
            <Link href="/tug-of-war" className={`nav-link ${location === '/tug-of-war' ? 'active' : ''}`} data-testid="link-tug-of-war">Tug of War</Link>
            <Link href="/vault" className={`nav-link ${location === '/vault' ? 'active' : ''}`} data-testid="link-vault">Vault</Link>
            <Link href="/diya" className={`nav-link ${location === '/diya' ? 'active' : ''}`} data-testid="link-diya">Diya</Link>
            <Link href="/leaderboard" className={`nav-link ${location === '/leaderboard' ? 'active' : ''}`} data-testid="link-leaderboard">Live scores</Link>
            <Link href="/admin" className={`nav-link ${location === '/admin' ? 'active' : ''}`} data-testid="link-admin">Admin</Link>
            <button className="icon-button" onClick={fullscreen} aria-label="Enter fullscreen" data-testid="button-fullscreen"><Expand size={17} /></button>
            <button className="icon-button" onClick={() => { setSound(!sound); playTone(!sound, 'tap'); }} aria-label={sound ? 'Mute sound' : 'Enable sound'} data-testid="button-sound">{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
             <img className="school-logo" src="/guru-assets/gurukul-logo-header.jpg" alt="Shree Swaminarayan Gurukul International School" />
          </nav>
        </header>
        {children}
        <img className="school-logo-corner" src="/guru-assets/gurukul-logo.jpg" alt="Shree Swaminarayan Gurukul International School – Gurugram" />
      </div>
    </div>
  );
}

function GuruCard({ guru, index }: { guru: GuruEntry; index: number }) {
  return (
    <article className="guru-card fade-up" style={{ animationDelay: `${index * .06}s` }} data-testid={`card-guru-${guru.id}`}>
      <div className="guru-image"><img src={guru.image} alt={guru.name} /></div>
      <div className="guru-info"><div className="guru-order">0{index + 1} / PARAMPARA</div><div className="guru-name">{guru.name}</div><div className="guru-subtitle">{guru.subtitle}</div></div>
    </article>
  );
}

function Home() {
  const [gurus] = useLocalState('guru-entries-v3', portraits);
  const ordered = [...gurus].sort((a, b) => a.order - b.order);
  return (
    <main>
      <section className="hero">
        <div className="fade-up">
          <div className="eyebrow">Gurukul school competition · 2026</div>
          <h1 className="display">In the presence of <em>guidance.</em></h1>
          <p className="hero-copy">A shared moment of attention, remembrance, and joyful learning. Explore the Guru Parampara, then take your place in the live class challenge.</p>
          <div className="hero-actions"><Link href="/game" className="button button-primary" data-testid="button-start-game">Enter the challenge <ArrowRight size={16} /></Link><Link href="/leaderboard" className="button button-quiet" data-testid="button-view-leaderboard">View live scores</Link></div>
        </div>
        <div className="hero-visual fade-up delay-2"><div className="hero-orbit"><div className="hero-orbit-inner"><img src={ordered[0]?.image ?? portraits[0].image} alt={ordered[0]?.name ?? portraits[0].name} /></div></div><div className="hero-stamp">Guru<br />Parampara<small>Visit 2026</small></div></div>
      </section>
      <section>
        <div className="section-heading"><div><div className="eyebrow">The gallery</div><h2 className="display">Meet the Parampara</h2></div><p>The supplied portrait, presented with care. Take a moment with the name before the questions begin.</p></div>
        <div className="gallery-grid">{ordered.length ? ordered.map((guru, index) => <GuruCard key={guru.id} guru={guru} index={index} />) : <div className="panel empty-state">No Guru entries yet. Visit Admin to add the gallery.</div>}</div>
      </section>
      <section className="quote-band"><blockquote>“The best answer begins with a quiet moment of attention.”</blockquote><cite>Gurukul Visit · 2026</cite></section>
    </main>
  );
}

function StartGame({ onStart }: { onStart: () => void }) {
  return <section className="game-shell game-intro fade-up"><div className="eyebrow" style={{ color: '#dca847' }}>The live class challenge</div><h1 className="display">Know your<br /><em>Guru.</em></h1><p>One portrait. One question at a time. Choose the verified name you know.</p><div className="game-meta"><div className="meta-block"><div className="meta-value">+20</div><div className="meta-label">correct answer</div></div><div className="meta-block"><div className="meta-value">CLASS 3</div><div className="meta-label">opening class</div></div></div><button className="button button-gold" onClick={onStart} data-testid="button-begin-challenge">Begin the challenge <ArrowRight size={17} /></button><Link href="/tug-of-war" className="game-switch-link" data-testid="link-open-tug-of-war">New game · Quiz Tug of War <ArrowRight size={15} /></Link></section>;
}

function Game() {
  const [allQuestions] = useLocalState<Question[]>('guru-questions-v4', initialQuestions);
  const questions = useMemo(() => allQuestions.filter((item) => item.category !== 'Tug of War'), [allQuestions]);
  const [competition, setCompetition] = useLocalState<Competition>('guru-competition', defaultCompetition);
  const [sound] = useLocalState('guru-sound-enabled', true);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [toast, setToast] = useState('');
  const question = questions[competition.questionIndex];
  const activeClass = classNames[competition.questionIndex % 5];
  useEffect(() => {
    if (competition.gameStatus !== 'active') return;
    setSelected(null); setFeedback(null);
  }, [competition.questionIndex, competition.gameStatus]);
  const start = () => { setCompetition({ ...competition, gameStatus: 'active', questionIndex: 0 }); playTone(sound, 'tap'); };
  function handleAnswer(answer: number) {
    if (selected !== null || !question || competition.gameStatus !== 'active') return;
    const correct = answer === question.correctAnswer;
    setSelected(answer); setFeedback(correct ? 'correct' : 'wrong'); playTone(sound, correct ? 'correct' : 'wrong');
    const points = correct ? question.points : 0;
    const previousScore = competition.scores[activeClass] ?? 0;
    const newScore = previousScore + points;
    const updatedScores = { ...competition.scores, [activeClass]: newScore };
    const history = [...competition.scoreHistory, {
      id: `${Date.now()}`, questionIndex: competition.questionIndex, className: activeClass,
      points, action: correct ? 'Correct answer' : 'Wrong answer',
      previousScore, newScore, at: new Date().toISOString(),
    }];
    window.setTimeout(() => {
      const next = competition.questionIndex + 1;
      if (next >= questions.length) { setCompetition({ ...competition, scores: updatedScores, scoreHistory: history, gameStatus: 'finished' }); playTone(sound, 'finish'); }
      else setCompetition({ ...competition, scores: updatedScores, scoreHistory: history, questionIndex: next });
    }, 1100);
  }
  if (competition.gameStatus === 'idle' && !question) return <section className="panel empty-state"><CircleHelp size={30} /><h2>Questions are being prepared</h2><p>An administrator needs to add a valid question before the challenge can begin.</p><Link href="/admin" className="button button-primary" data-testid="button-go-admin">Open Admin</Link></section>;
  if (competition.gameStatus === 'idle') return <StartGame onStart={start} />;
  if (competition.gameStatus === 'finished') {
    const total = Object.values(competition.scores).reduce((sum, score) => sum + score, 0);
    return <section className="results fade-up"><div className="eyebrow">Final results · challenge complete</div><h1 className="display">Well played,<br />everyone.</h1><div className="result-card"><div className="result-score">{total}</div><div className="result-label">points shared across the classes</div><div style={{ marginTop: 24 }}>{[...classNames].sort((a, b) => competition.scores[b] - competition.scores[a]).map((name, index) => <div className="stat-line" key={name}><span>{index + 1}. {name}</span><strong>{competition.scores[name]} pts</strong></div>)}</div></div><div className="result-actions"><Link href="/leaderboard" className="button button-primary" data-testid="button-results-leaderboard"><Trophy size={16} /> See the leaderboard</Link><button className="button button-quiet" onClick={() => setCompetition({ ...defaultCompetition, scores: Object.fromEntries(classNames.map((name) => [name, 0])) })} data-testid="button-play-again"><RotateCcw size={16} /> Play again</button></div></section>;
  }
  if (!question) return <section className="panel empty-state"><CircleHelp size={30} /><h2>Questions are being prepared</h2><p>An administrator needs to add a valid question before the challenge can begin.</p><Link href="/admin" className="button button-primary" data-testid="button-go-admin">Open Admin</Link></section>;
  return <section className="quiz-shell fade-up"><div className="quiz-top"><div className="class-pill">{activeClass} · QUESTION {competition.questionIndex + 1} / {questions.length}</div><div className="progress-track"><div className="progress-fill" style={{ width: `${((competition.questionIndex + 1) / questions.length) * 100}%` }} /></div></div><div className="question-grid"><div className="question-portrait"><img src={question.image} alt="Portrait for this question" /><div className="question-label">Look closely.</div></div><div className="question-copy"><div className="eyebrow">Choose one answer · {question.points} points</div><h2>{question.question}</h2><div className="options">{question.options.map((option, index) => <button key={`${question.id}-${index}`} className={`option ${selected !== null && index === question.correctAnswer ? 'correct' : ''} ${selected === index && feedback === 'wrong' ? 'wrong' : ''}`} onClick={() => handleAnswer(index)} disabled={selected !== null} data-testid={`button-answer-${index}`}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span>{selected !== null && index === question.correctAnswer ? <Check size={18} /> : null}</button>)}</div><div className="answer-note">{feedback === 'correct' ? <strong style={{ color: '#4f7d52' }}>Correct. The class earns {question.points} points.</strong> : feedback === 'wrong' ? <span>That answer has been recorded. The next class is ready.</span> : 'Touch an answer to lock it in.'}</div></div></div></section>;
}

type VaultClassId = 'CLASS 3' | 'CLASS 4' | 'CLASS 5' | 'CLASS 6' | 'CLASS 7';
type VaultProgressItem = { status: 'locked' | 'in-progress' | 'unlocked'; completed: boolean };
type VaultProgressMap = Record<VaultClassId, VaultProgressItem>;
type VaultChallengeState = { completed: VaultClassId[]; activeClass: VaultClassId | null };
type VaultPathStep = { id: string; prompt: string; choices: string[]; correctIndex: number };
type VaultRiddleItem = { id: string; riddle: string; hint: string; options: string[]; correctIndex: number };
type VaultTrialStage = { id: string; label: string; prompt: string; choices: string[]; correctIndex: number };

const VAULT_PATH_STEPS_KEY = 'vault-path-steps';
const VAULT_RIDDLES_KEY = 'vault-riddles';
const VAULT_TRIAL_STAGES_KEY = 'vault-trial-stages';

const defaultVaultPathSteps: VaultPathStep[] = [
  { id: 'path-1', prompt: 'The path opens at the threshold. What carries you forward?', choices: ['Respect', 'Racing ahead', 'Noise'], correctIndex: 0 },
  { id: 'path-2', prompt: 'The diya pauses beside three stones. Which one keeps the path clear?', choices: ['Discipline', 'Distraction', 'Delay'], correctIndex: 0 },
  { id: 'path-3', prompt: 'A fellow traveler needs a hand at the final turn. What completes the path?', choices: ['Service', 'Silence', 'Taking the lead'], correctIndex: 0 },
  { id: 'path-4', prompt: 'The morning bell rings before class begins. What shows readiness?', choices: ['Punctuality', 'Wandering off', 'Arguing with a friend'], correctIndex: 0 },
  { id: 'path-5', prompt: 'A senior student offers guidance. What is the right response?', choices: ['Listening with attention', 'Interrupting them', 'Walking away'], correctIndex: 0 },
  { id: 'path-6', prompt: 'You notice litter near the prayer hall. What should you do?', choices: ['Pick it up quietly', 'Ignore it', 'Point it out to blame someone'], correctIndex: 0 },
  { id: 'path-7', prompt: 'A younger student cannot reach the water pot. What helps the path stay lit?', choices: ['Helping them reach it', 'Laughing at them', 'Taking your turn first'], correctIndex: 0 },
];
const defaultVaultRiddles: VaultRiddleItem[] = [
  { id: 'riddle-1', riddle: 'I grow when shared, become clearer when practiced, and make room for another voice. What am I?', hint: 'Hint: it begins before the first answer is spoken.', options: ['Quiet preparation', 'A louder voice', 'A faster step', 'A locked door'], correctIndex: 0 },
  { id: 'riddle-2', riddle: 'I am not owned, yet everyone carries me. I grow lighter when given away. What am I?', hint: 'Hint: elders often ask for it before opinions.', options: ['A smile', 'Money', 'A weapon', 'A shadow'], correctIndex: 0 },
  { id: 'riddle-3', riddle: 'I have no hands, yet I steady the mind before every task. What am I?', hint: 'Hint: it is practised in silence, often with closed eyes.', options: ['Meditation', 'Sleep', 'Running', 'Shouting'], correctIndex: 0 },
  { id: 'riddle-4', riddle: 'The more you empty me of pride, the more I can hold of wisdom. What am I?', hint: 'Hint: think of a student\'s open mind.', options: ['A humble heart', 'A locked box', 'An empty plate', 'A closed book'], correctIndex: 0 },
];
const defaultVaultTrialStages: VaultTrialStage[] = [
  { id: 'trial-1', label: 'PATTERN', prompt: 'Complete the sequence: 2 · 4 · 6 · ?', choices: ['7', '8', '9'], correctIndex: 1 },
  { id: 'trial-2', label: 'VALUES', prompt: 'A teammate is stuck. Which choice opens the shared path?', choices: ['Leave them behind', 'Share the task', 'Take every turn'], correctIndex: 1 },
  { id: 'trial-3', label: 'COMBINATION', prompt: 'Set the final sequence in the order shown on the tablets.', choices: ['BELL · TREE · BOOK', 'TREE · BOOK · BELL', 'BOOK · BELL · TREE'], correctIndex: 2 },
  { id: 'trial-4', label: 'PATTERN', prompt: 'Complete the sequence: 3 · 6 · 12 · 24 · ?', choices: ['30', '36', '48'], correctIndex: 2 },
  { id: 'trial-5', label: 'REASONING', prompt: 'If all Gurukul students are punctual, and Aryan is a Gurukul student, what follows?', choices: ['Aryan is punctual', 'Aryan is tall', 'Nothing can be said'], correctIndex: 0 },
  { id: 'trial-6', label: 'VALUES', prompt: 'A chamber offers a shortcut that breaks a rule. What keeps the trial honest?', choices: ['Taking the shortcut quietly', 'Declining and following the rule', 'Blaming the rule instead'], correctIndex: 1 },
  { id: 'trial-7', label: 'PATTERN', prompt: 'Complete the sequence: 1 · 4 · 9 · 16 · ?', choices: ['20', '25', '30'], correctIndex: 1 },
  { id: 'trial-8', label: 'COMBINATION', prompt: 'Three seals must open in the order of increasing value: 12, 7, 19. Which order is correct?', choices: ['12 · 7 · 19', '7 · 12 · 19', '19 · 12 · 7'], correctIndex: 1 },
];
function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - .5);
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

const vaultClasses: { id: VaultClassId; number: string; title: string; subtitle: string }[] = [
  { id: 'CLASS 3', number: 'I', title: 'Gurukul Memory', subtitle: 'Remember the essentials' },
  { id: 'CLASS 4', number: 'II', title: 'Dharma Path', subtitle: 'Follow the glowing way' },
  { id: 'CLASS 5', number: 'III', title: 'Gurukul Sort', subtitle: 'Put each thing in its place' },
  { id: 'CLASS 6', number: 'IV', title: "Guru's Riddle", subtitle: 'Read between the lines' },
  { id: 'CLASS 7', number: 'V', title: 'Final Trial', subtitle: 'Three stages. One key.' },
];
const defaultVaultProgress: VaultProgressMap = Object.fromEntries(
  vaultClasses.map(({ id }) => [id, { status: 'locked', completed: false }]),
) as VaultProgressMap;
const defaultVaultChallengeState: VaultChallengeState = { completed: [], activeClass: null };

function VaultMemory({ onSuccess, sound }: { onSuccess: () => void; sound: boolean }) {
  type MemoryCard = { id: string; pair: string; label: string; icon: 'book' | 'bell' | 'tree' | 'lamp' | 'bead' | 'water' };
  const cardSet: MemoryCard[] = [
    { id: 'book-a', pair: 'book', label: 'BOOK', icon: 'book' }, { id: 'book-b', pair: 'book', label: 'BOOK', icon: 'book' },
    { id: 'bell-a', pair: 'bell', label: 'BELL', icon: 'bell' }, { id: 'bell-b', pair: 'bell', label: 'BELL', icon: 'bell' },
    { id: 'tree-a', pair: 'tree', label: 'TREE', icon: 'tree' }, { id: 'tree-b', pair: 'tree', label: 'TREE', icon: 'tree' },
    { id: 'lamp-a', pair: 'lamp', label: 'LAMP', icon: 'lamp' }, { id: 'lamp-b', pair: 'lamp', label: 'LAMP', icon: 'lamp' },
    { id: 'bead-a', pair: 'bead', label: 'BEAD', icon: 'bead' }, { id: 'bead-b', pair: 'bead', label: 'BEAD', icon: 'bead' },
    { id: 'water-a', pair: 'water', label: 'WATER POT', icon: 'water' }, { id: 'water-b', pair: 'water', label: 'WATER POT', icon: 'water' },
  ];
  const [cards] = useState(() => [...cardSet].sort(() => Math.random() - .5));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const choose = (card: MemoryCard) => {
    if (busy || flipped.includes(card.id) || matched.includes(card.pair) || complete) return;
    const next = [...flipped, card.id];
    setFlipped(next); playTone(sound, 'tap');
    if (next.length === 2) {
      setBusy(true);
      const first = cards.find((item) => item.id === next[0]);
      const second = cards.find((item) => item.id === next[1]);
      window.setTimeout(() => {
        if (first && second && first.pair === second.pair) { setMatched((current) => [...current, first.pair]); playTone(sound, 'correct'); }
        else playTone(sound, 'wrong');
        setFlipped([]); setBusy(false);
      }, 560);
    }
  };
  useEffect(() => {
    if (matched.length === 6 && !complete) { setComplete(true); window.setTimeout(onSuccess, 500); }
  }, [matched, complete, onSuccess]);
  const iconFor = (icon: MemoryCard['icon']) => {
    if (icon === 'book') return <BookOpen size={24} />;
    if (icon === 'bell') return <Bell size={24} />;
    if (icon === 'tree') return <TreePine size={24} />;
    if (icon === 'lamp') return <Lamp size={24} />;
    if (icon === 'water') return <Droplets size={24} />;
    return <CircleDot size={24} />;
  };
  return <div className="vault-challenge-content"><div className="vault-challenge-intro"><div className="eyebrow">CLASS 3 · MEMORY CHAMBER</div><h2 className="display">Remember what belongs.</h2><p>Turn two tablets at a time. Match all six pairs to open the first lock.</p><div className="vault-mini-progress">{matched.length} / 6 pairs matched</div></div><div className="memory-board">{cards.map((card) => { const isOpen = flipped.includes(card.id) || matched.includes(card.pair); return <button key={card.id} className={`memory-card ${isOpen ? 'open' : ''} ${matched.includes(card.pair) ? 'matched' : ''}`} onClick={() => choose(card)} aria-label={isOpen ? card.label : 'Face-down memory tablet'} data-testid={`memory-card-${card.id}`}><span className="memory-card-face memory-card-back"><span className="vault-glyph">◇</span><small>GURUKUL</small></span><span className="memory-card-face memory-card-front">{iconFor(card.icon)}<small>{card.label}</small></span></button>; })}</div></div>;
}

function VaultPath({ onSuccess, sound }: { onSuccess: () => void; sound: boolean }) {
  const [stepPool] = useLocalState<VaultPathStep[]>(VAULT_PATH_STEPS_KEY, defaultVaultPathSteps);
  const [steps] = useState(() => pickRandom(stepPool, 3).map((item) => ({ prompt: item.prompt, choices: item.choices, correct: item.choices[item.correctIndex] ?? item.choices[0] })));
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('Choose the value that lets the diya continue.');
  const [complete, setComplete] = useState(false);
  const choose = (choice: string) => {
    if (complete) return;
    if (choice === steps[step].correct) {
      playTone(sound, 'correct');
      if (step === steps.length - 1) { setComplete(true); window.setTimeout(onSuccess, 600); }
      else { setStep((current) => current + 1); setMessage('The light continues. One step deeper.'); }
    } else {
      playTone(sound, 'wrong'); setMessage('The path gently resets this step. Try again.');
    }
  };
  return <div className="vault-challenge-content path-challenge"><div className="vault-challenge-intro"><div className="eyebrow">CLASS 4 · THE LIT PATH</div><h2 className="display">Follow the light.</h2><p>Three decisions lie between the outer stone and the inner door.</p></div><div className="path-board"><div className="path-line">{steps.map((_, index) => <span key={index} className={`path-node ${index <= step ? 'active' : ''}`}><span>{index + 1}</span></span>)}</div><div className="vault-diya" aria-hidden="true"><span /></div><div className="path-prompt"><span className="mono">STEP {step + 1} / 3</span><h3>{steps[step].prompt}</h3><div className="path-choices">{steps[step].choices.map((choice) => <button className="vault-choice" key={choice} onClick={() => choose(choice)} data-testid={`path-choice-${choice.toLowerCase().replace(' ', '-')}`}>{choice}<ArrowRight size={16} /></button>)}</div><div className="challenge-message">{message}</div></div></div></div>;
}

function VaultSort({ onSuccess, sound }: { onSuccess: () => void; sound: boolean }) {
  type SortCard = { id: string; label: string; category: 'GOOD HABITS' | 'GURUKUL VALUES' | 'DAILY RESPONSIBILITIES'; mark: string };
  const cards: SortCard[] = [
    { id: 'quiet', label: 'Quiet preparation', category: 'GOOD HABITS', mark: '01' },
    { id: 'listen', label: 'Listen fully', category: 'GURUKUL VALUES', mark: '02' },
    { id: 'books', label: 'Keep books ready', category: 'DAILY RESPONSIBILITIES', mark: '03' },
    { id: 'practice', label: 'Practice patiently', category: 'GOOD HABITS', mark: '04' },
    { id: 'truth', label: 'Speak truthfully', category: 'GURUKUL VALUES', mark: '05' },
    { id: 'place', label: 'Return what you use', category: 'DAILY RESPONSIBILITIES', mark: '06' },
    { id: 'rest', label: 'Rest on time', category: 'GOOD HABITS', mark: '07' },
    { id: 'respect', label: 'Respect every learner', category: 'GURUKUL VALUES', mark: '08' },
    { id: 'help', label: 'Help set the space', category: 'DAILY RESPONSIBILITIES', mark: '09' },
  ];
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('Tap a card, then choose its rightful chamber.');
  const [complete, setComplete] = useState(false);
  const remaining = cards.filter((card) => !placed[card.id]);
  const placeCard = (category: SortCard['category']) => {
    const card = cards.find((item) => item.id === selected);
    if (!card || complete) return;
    if (card.category === category) {
      const next = { ...placed, [card.id]: category }; setPlaced(next); setSelected(null); setMessage('Placed correctly. The shelves are taking shape.'); playTone(sound, 'correct');
      if (Object.keys(next).length === cards.length) { setComplete(true); window.setTimeout(onSuccess, 650); }
    } else { setSelected(null); setMessage('That card returns to the table. Look again.'); playTone(sound, 'wrong'); }
  };
  return <div className="vault-challenge-content"><div className="vault-challenge-intro"><div className="eyebrow">CLASS 5 · THE THREE SHELVES</div><h2 className="display">Put each thing in its place.</h2><p>Drag a tablet, or tap to select and tap a shelf. Each card has one rightful home.</p></div><div className="sort-layout"><div className="sort-table"><div className="mono">UNSORTED TABLE · {remaining.length} REMAINING</div><div className="sort-cards">{remaining.map((card) => <button draggable className={`sort-card ${selected === card.id ? 'selected' : ''}`} key={card.id} onClick={() => { setSelected(card.id); playTone(sound, 'tap'); }} onDragStart={() => setSelected(card.id)} data-testid={`sort-card-${card.id}`}><span>{card.mark}</span><strong>{card.label}</strong></button>)}</div>{remaining.length === 0 && <div className="sort-complete"><Check size={22} /> All tablets are in place.</div>}</div><div className="sort-shelves">{(['GOOD HABITS', 'GURUKUL VALUES', 'DAILY RESPONSIBILITIES'] as SortCard['category'][]).map((category) => <button className="sort-shelf" key={category} onDragOver={(event) => event.preventDefault()} onDrop={() => placeCard(category)} onClick={() => placeCard(category)} data-testid={`sort-shelf-${category.toLowerCase().replaceAll(' ', '-')}`}><span className="shelf-notch" /><span className="mono">{category}</span><span className="shelf-count">{Object.values(placed).filter((value) => value === category).length}</span><span className="shelf-cards">{cards.filter((card) => placed[card.id] === category).map((card) => <span key={card.id}>{card.label}</span>)}</span></button>)}</div></div><div className="challenge-message">{message}</div></div>;
}

function VaultRiddle({ onSuccess, sound }: { onSuccess: () => void; sound: boolean }) {
  const [riddlePool] = useLocalState<VaultRiddleItem[]>(VAULT_RIDDLES_KEY, defaultVaultRiddles);
  const [riddle] = useState(() => pickRandom(riddlePool, 1)[0] ?? defaultVaultRiddles[0]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [message, setMessage] = useState('A single hint is kept beneath the seal.');
  const options = riddle.options;
  const answer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    if (index === riddle.correctIndex) { setMessage('The scroll warms. The answer is sound.'); playTone(sound, 'correct'); window.setTimeout(onSuccess, 700); }
    else { setMessage('The ink fades, but the riddle remains. Read it once more.'); playTone(sound, 'wrong'); }
  };
  return <div className="vault-challenge-content riddle-challenge"><div className="eyebrow" style={{ color: '#dca847' }}>CLASS 6 · THE SEALED SCROLL</div><h2 className="display">A question for the attentive.</h2><div className={`riddle-scroll ${selected === riddle.correctIndex ? 'solved' : ''}`}><div className="riddle-seal"><span>IV</span></div><div className="mono">RIDDLE 01</div><p>“{riddle.riddle}”</p><div className="riddle-options">{options.map((option, index) => <button className={`riddle-option ${selected === index ? index === riddle.correctIndex ? 'right' : 'wrong' : ''}`} key={option} onClick={() => answer(index)} disabled={selected === riddle.correctIndex} data-testid={`riddle-answer-${index}`}>{String.fromCharCode(65 + index)} <span>{option}</span></button>)}</div><button className="riddle-hint" onClick={() => { if (!hintUsed) { setHintUsed(true); setMessage(riddle.hint); playTone(sound, 'tap'); } }} disabled={hintUsed} data-testid="button-riddle-hint">{hintUsed ? 'Hint revealed' : 'Reveal one hint'}</button><div className="challenge-message">{message}</div></div></div>;
}

function VaultTrial({ onSuccess, sound }: { onSuccess: () => void; sound: boolean }) {
  const [stagePool] = useLocalState<VaultTrialStage[]>(VAULT_TRIAL_STAGES_KEY, defaultVaultTrialStages);
  const [stages] = useState(() => pickRandom(stagePool, 3).map((item) => ({ label: item.label, prompt: item.prompt, choices: item.choices, correct: item.choices[item.correctIndex] ?? item.choices[0] })));
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState('Three chambers stand between you and the key.');
  const current = stages[stage];
  const choose = (choice: string) => {
    if (choice !== current.correct) { setMessage('The chamber resets softly. Try this stage again.'); playTone(sound, 'wrong'); return; }
    playTone(sound, 'correct');
    if (stage === stages.length - 1) { setMessage('The final key recognizes your sequence.'); window.setTimeout(onSuccess, 700); }
    else { setStage(stage + 1); setMessage('The next chamber is ready.'); }
  };
  return <div className="vault-challenge-content final-trial"><div className="eyebrow">CLASS 7 · FINAL TRIAL</div><h2 className="display">Three chambers. One key.</h2><div className="trial-steps">{stages.map((item, index) => <div className={`trial-step ${index === stage ? 'current' : ''} ${index < stage ? 'done' : ''}`} key={item.label}><span>{index < stage ? <Check size={15} /> : index + 1}</span><small>{item.label}</small></div>)}</div><div className="trial-card"><div className="mono">{current.label} · CHAMBER {stage + 1}</div><h3>{current.prompt}</h3><div className="trial-options">{current.choices.map((choice) => <button className="vault-choice" key={choice} onClick={() => choose(choice)} data-testid={`trial-choice-${stage}-${choice.slice(0, 3).toLowerCase()}`}>{choice}<ArrowRight size={16} /></button>)}</div><div className="challenge-message">{message}</div></div></div>;
}

function VaultReveal({ onReset }: { onReset: () => void }) {
  return <section className="vault-reveal fade-up"><div className="vault-rays" /><div className="vault-open-mark"><Unlock size={54} /></div><div className="eyebrow">ALL FIVE LOCKS UNLOCKED</div><h1 className="display">The Gurukul Vault<br /><em>is opening.</em></h1><p>THE GURUKUL VAULT IS OPENING... You carried attention through every chamber. The next room is waiting.</p><blockquote className="vault-reveal-quote">Learning unlocks knowledge.<br />Discipline unlocks character.<br />Seva unlocks greatness.</blockquote><div className="vault-reveal-actions"><Link href="/" className="button button-gold" data-testid="button-enter-parampara">Enter Guru Parampara <ArrowRight size={16} /></Link><button className="button button-quiet" onClick={onReset} data-testid="button-reset-vault"><RotateCcw size={16} /> Play again</button><Link href="/game" className="button button-quiet" data-testid="button-back-games">Back to games</Link></div></section>;
}

function VaultLock({ item, progress, onOpen, onReset }: { item: typeof vaultClasses[number]; progress: VaultProgressItem; onOpen: () => void; onReset: () => void }) {
  const isUnlocked = progress.status === 'unlocked';
  return <div className={`vault-lock-button ${progress.status}`} data-testid={`card-vault-${item.id.toLowerCase().replace(' ', '-')}`}>
    <button className="vault-lock-hit" onClick={onOpen} disabled={isUnlocked} data-testid={`button-vault-${item.id.toLowerCase().replace(' ', '-')}`}>
      <span className="vault-lock-top"><span className="vault-lock-number">{item.number}</span><span className="mono">{item.id}</span>{isUnlocked ? <Unlock size={17} /> : <LockKeyhole size={17} />}</span>
      <span className="vault-lock-glyph"><span className="vault-lock-shackle" /><span className="vault-lock-body"><LockKeyhole size={29} /></span></span>
      <span className="vault-lock-title">{item.title}</span>
      <span className="vault-lock-subtitle">{isUnlocked ? 'Unlocked · complete' : progress.status === 'in-progress' ? 'Resume challenge' : item.subtitle}</span>
      <span className="vault-lock-action">{isUnlocked ? 'SEALED OPEN' : progress.status === 'in-progress' ? 'CONTINUE' : 'ENTER CHAMBER'} <ArrowRight size={13} /></span>
    </button>
    {progress.status !== 'locked' && <button className="vault-lock-reset" onClick={onReset} aria-label={`Reset ${item.id} progress`} data-testid={`button-vault-reset-${item.id.toLowerCase().replace(' ', '-')}`}><RotateCcw size={13} /> Reset</button>}
  </div>;
}

function Vault() {
  const [progress, setProgress] = useLocalState<VaultProgressMap>('vaultProgress', defaultVaultProgress);
  const [challengeState, setChallengeState] = useLocalState<VaultChallengeState>('vaultChallengeState', defaultVaultChallengeState);
  const [finalOpen, setFinalOpen] = useLocalState('vaultFinalState', false);
  const [sound] = useLocalState('guru-sound-enabled', true);
  const [celebrationId, setCelebrationId] = useState<VaultClassId | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const unlockedCount = Object.values(progress).filter((item) => item.status === 'unlocked').length;
  const start = (id: VaultClassId) => {
    if (progress[id].status === 'unlocked') return;
    setProgress({ ...progress, [id]: { ...progress[id], status: 'in-progress' } });
    setChallengeState({ ...challengeState, activeClass: id });
    playTone(sound, 'tap');
  };
  const finish = (id: VaultClassId) => {
    const nextProgress = { ...progress, [id]: { status: 'unlocked' as const, completed: true } };
    const nextCompleted = [...new Set([...challengeState.completed, id])];
    setProgress(nextProgress);
    setChallengeState({ completed: nextCompleted, activeClass: null });
    setCelebrationId(id); playTone(sound, 'finish');
    window.setTimeout(() => {
      setCelebrationId(null);
      if (nextCompleted.length === vaultClasses.length) setFinalOpen(true);
    }, 1650);
  };
  const reset = () => { setProgress(defaultVaultProgress); setChallengeState(defaultVaultChallengeState); setFinalOpen(false); setCelebrationId(null); };
  const resetClassProgress = (id: VaultClassId) => {
    if (!window.confirm(`Reset ${id} vault progress? This clears its completed status.`)) return;
    setProgress({ ...progress, [id]: { status: 'locked', completed: false } });
    if (challengeState.activeClass === id) setChallengeState({ ...challengeState, activeClass: null });
  };
  if (finalOpen) return <VaultReveal onReset={reset} />;
  if (challengeState.activeClass) {
    const props = { onSuccess: () => finish(challengeState.activeClass as VaultClassId), sound };
    return <main className="vault-page"><div className="vault-challenge-shell"><button className="vault-back" onClick={() => setChallengeState({ ...challengeState, activeClass: null })} data-testid="button-vault-back"><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Return to vault</button>{challengeState.activeClass === 'CLASS 3' && <VaultMemory {...props} />}{challengeState.activeClass === 'CLASS 4' && <VaultPath {...props} />}{challengeState.activeClass === 'CLASS 5' && <VaultSort {...props} />}{challengeState.activeClass === 'CLASS 6' && <VaultRiddle {...props} />}{challengeState.activeClass === 'CLASS 7' && <VaultTrial {...props} />}</div>{celebrationId && <VaultCelebration label={celebrationId} />}</main>;
  }
  return <main className="vault-page"><div className="vault-hero-line"><div><div className="eyebrow">A main-stage Gurukul challenge</div><h1 className="display">The Gurukul <em>Vault</em></h1><p>Five Locks. Five Challenges. One Grand Revelation. The vault opens only when every challenge is complete.</p></div><div className="vault-progress-orbit"><div className="vault-progress-number">{unlockedCount}<span>/ 5</span></div><div className="mono">LOCKS<br />UNLOCKED</div></div></div><div className="vault-progress-bar"><span style={{ width: `${(unlockedCount / 5) * 100}%` }} /></div><div className="vault-status-line"><span className="mono">{unlockedCount} / 5 LOCKS UNLOCKED</span><span>Choose an available chamber to begin.</span></div><div className="vault-lock-grid">{vaultClasses.map((item) => <VaultLock key={item.id} item={item} progress={progress[item.id]} onOpen={() => start(item.id)} onReset={() => resetClassProgress(item.id)} />)}</div>{unlockedCount > 0 && <button className="vault-how-toggle" style={{ marginTop: 10 }} onClick={reset} data-testid="button-vault-reset-all"><RotateCcw size={15} /> Reset all vault progress</button>}<button className="vault-how-toggle" onClick={() => setShowHowToPlay((current) => !current)} aria-expanded={showHowToPlay} data-testid="button-vault-how-to-play"><Sparkles size={15} /> {showHowToPlay ? 'Close how to play' : 'How to play'}</button>{showHowToPlay && <section className="vault-how"><div className="vault-how-mark"><Sparkles size={21} /></div><div><div className="eyebrow">How to play</div><h2 className="display">Five locks. One shared reveal.</h2><p>Choose an available class and complete its challenge. A lock opens only after its chamber is successfully completed. Finish all five to open the vault and reveal what waits inside.</p></div><div className="vault-how-steps"><span><b>01</b> Choose a class</span><span><b>02</b> Complete its challenge</span><span><b>03</b> Open the vault</span></div></section>}{celebrationId && <VaultCelebration label={celebrationId} />}</main>;
}

function VaultCelebration({ label }: { label: VaultClassId }) {
  return <div className="vault-celebration" role="status"><div className="vault-particle particle-a" /><div className="vault-particle particle-b" /><div className="vault-particle particle-c" /><div className="celebration-lock"><Unlock size={35} /></div><div className="eyebrow">CHAMBER CLEARED</div><h2 className="display">{label} lock unlocked.</h2><p>The path is open. Return to the vault.</p></div>;
}

type DiyaClassId = 'CLASS 3' | 'CLASS 4' | 'CLASS 5' | 'CLASS 6' | 'CLASS 7';
type DiyaQuestion = { id: string; classAssignment: DiyaClassId; question: string; options: string[]; correctAnswer: number };
type DiyaSettings = {
  required: Record<DiyaClassId, number>;
  order: 'sequential' | 'random';
  retryMode: 'unlimited' | 'limited';
  attempts: number;
};
type DiyaClassState = {
  status: 'not-started' | 'in-progress' | 'unlocked' | 'lit';
  questionIds: string[];
  currentIndex: number;
  correctIds: string[];
  attemptsRemaining: number;
};
type DiyaProgress = Record<DiyaClassId, DiyaClassState>;

const diyaClasses: { id: DiyaClassId; roman: string; quality: string }[] = [
  { id: 'CLASS 3', roman: 'I', quality: 'Notice the first light' },
  { id: 'CLASS 4', roman: 'II', quality: 'Follow it with care' },
  { id: 'CLASS 5', roman: 'III', quality: 'Keep the flame steady' },
  { id: 'CLASS 6', roman: 'IV', quality: 'Read what the light reveals' },
  { id: 'CLASS 7', roman: 'V', quality: 'Carry the light forward' },
];
const defaultDiyaSettings: DiyaSettings = {
  required: { 'CLASS 3': 3, 'CLASS 4': 3, 'CLASS 5': 3, 'CLASS 6': 3, 'CLASS 7': 3 },
  order: 'sequential',
  retryMode: 'unlimited',
  attempts: 3,
};
const createDiyaState = (): DiyaClassState => ({
  status: 'not-started', questionIds: [], currentIndex: 0, correctIds: [], attemptsRemaining: 0,
});
const defaultDiyaProgress: DiyaProgress = {
  'CLASS 3': createDiyaState(), 'CLASS 4': createDiyaState(), 'CLASS 5': createDiyaState(),
  'CLASS 6': createDiyaState(), 'CLASS 7': createDiyaState(),
};
const diyaStatusLabel: Record<DiyaClassState['status'], string> = {
  'not-started': 'Not started', 'in-progress': 'In progress', unlocked: 'Unlocked', lit: 'Lit',
};
const defaultDiyaQuestions: DiyaQuestion[] = [
  // ---------- CLASS 3 ----------
  { id: 'diya-c3-1', classAssignment: 'CLASS 3', question: 'What should we do before we start our morning prayers?', options: ['Wash our hands and sit calmly', 'Keep talking loudly', 'Run around the room', 'Ignore everyone'], correctAnswer: 0 },
  { id: 'diya-c3-2', classAssignment: 'CLASS 3', question: 'What do we call helping others without expecting anything back?', options: ['Seva', 'Pride', 'Anger', 'Greed'], correctAnswer: 0 },
  { id: 'diya-c3-3', classAssignment: 'CLASS 3', question: 'How should we greet our Guru?', options: ['With respect and folded hands', 'By shouting', 'By ignoring them', 'By turning away'], correctAnswer: 0 },
  { id: 'diya-c3-4', classAssignment: 'CLASS 3', question: 'What should we do with our books after using them?', options: ['Keep them back neatly', 'Throw them anywhere', 'Tear the pages', 'Leave them on the floor'], correctAnswer: 0 },
  { id: 'diya-c3-5', classAssignment: 'CLASS 3', question: 'Why do we light a diya at the mandir?', options: ['To welcome light and remove darkness', 'Just for fun', 'To make smoke', 'It has no meaning'], correctAnswer: 0 },
  // ---------- CLASS 4 ----------
  { id: 'diya-c4-1', classAssignment: 'CLASS 4', question: 'What is "satsang"?', options: ['Being in the company of good and truthful people', 'Being alone always', 'Arguing with friends', 'Watching TV all day'], correctAnswer: 0 },
  { id: 'diya-c4-2', classAssignment: 'CLASS 4', question: 'Which quality helps us keep a promise even when it is difficult?', options: ['Discipline', 'Laziness', 'Forgetfulness', 'Carelessness'], correctAnswer: 0 },
  { id: 'diya-c4-3', classAssignment: 'CLASS 4', question: 'What should we do when we make a mistake?', options: ['Accept it and try to correct it', 'Blame someone else', 'Hide it and lie', 'Get angry at others'], correctAnswer: 0 },
  { id: 'diya-c4-4', classAssignment: 'CLASS 4', question: 'What does "ahimsa" mean?', options: ['Non-violence towards all living beings', 'Fighting with everyone', 'Speaking rudely', 'Breaking rules'], correctAnswer: 0 },
  { id: 'diya-c4-5', classAssignment: 'CLASS 4', question: 'How should we treat our elders?', options: ['With respect and obedience', 'With rudeness', 'By ignoring their advice', 'By arguing back'], correctAnswer: 0 },
  // ---------- CLASS 5 ----------
  { id: 'diya-c5-1', classAssignment: 'CLASS 5', question: 'What is the meaning of "guru bhakti"?', options: ['Devotion and respect towards one\'s teacher', 'Ignoring the teacher\'s words', 'Competing with the teacher', 'Avoiding the teacher'], correctAnswer: 0 },
  { id: 'diya-c5-2', classAssignment: 'CLASS 5', question: 'Why is truthfulness (satya) important in the Gurukul?', options: ['It builds trust and a clear conscience', 'It helps us win arguments', 'It makes us famous', 'It has no real value'], correctAnswer: 0 },
  { id: 'diya-c5-3', classAssignment: 'CLASS 5', question: 'What does "vinaya" (humility) help us do?', options: ['Stay open to learning from others', 'Boast about our achievements', 'Refuse help from anyone', 'Look down on others'], correctAnswer: 0 },
  { id: 'diya-c5-4', classAssignment: 'CLASS 5', question: 'What is the purpose of daily self-reflection (atma-chintan)?', options: ['To understand our actions and improve ourselves', 'To find faults in others', 'To waste time', 'To feel proud'], correctAnswer: 0 },
  { id: 'diya-c5-5', classAssignment: 'CLASS 5', question: 'Which habit reflects true cleanliness in the Gurukul way of life?', options: ['Cleanliness of both body and mind', 'Only cleaning the room once a year', 'Ignoring personal hygiene', 'Keeping things clean only when guests visit'], correctAnswer: 0 },
  // ---------- CLASS 6 ----------
  { id: 'diya-c6-1', classAssignment: 'CLASS 6', question: 'What is "dharma" in simple terms?', options: ['One\'s righteous duty and right conduct', 'Doing whatever feels convenient', 'Following no rules at all', 'Copying others blindly'], correctAnswer: 0 },
  { id: 'diya-c6-2', classAssignment: 'CLASS 6', question: 'How does "seva" (selfless service) benefit the one who serves?', options: ['It builds humility and inner joy', 'It brings only tiredness', 'It has no effect on the person', 'It is done only for rewards'], correctAnswer: 0 },
  { id: 'diya-c6-3', classAssignment: 'CLASS 6', question: 'What is the value of "santosh" (contentment)?', options: ['Being at peace with what we have while striving to grow', 'Wanting more than others always', 'Comparing ourselves constantly', 'Never being satisfied'], correctAnswer: 0 },
  { id: 'diya-c6-4', classAssignment: 'CLASS 6', question: 'Why do we practise "maun" (silence) during certain times?', options: ['To calm the mind and reflect deeply', 'To avoid answering questions', 'To ignore people', 'It has no purpose'], correctAnswer: 0 },
  { id: 'diya-c6-5', classAssignment: 'CLASS 6', question: 'What best describes "sanskar"?', options: ['Good values passed down through upbringing and tradition', 'Rules made up on the spot', 'Habits with no meaning', 'Something only elders need'], correctAnswer: 0 },
  // ---------- CLASS 7 ----------
  { id: 'diya-c7-1', classAssignment: 'CLASS 7', question: 'What is the deeper meaning of "seva" beyond just helping?', options: ['Serving without ego or expectation of return', 'Helping only when it is noticed by others', 'Serving to gain praise', 'Helping only close friends'], correctAnswer: 0 },
  { id: 'diya-c7-2', classAssignment: 'CLASS 7', question: 'How does the Gurukul view the balance between "abhyas" (practice) and "vairagya" (detachment)?', options: ['Both are needed together for steady growth', 'Only practice matters, detachment is unnecessary', 'Only detachment matters, practice is unnecessary', 'Neither is important'], correctAnswer: 0 },
  { id: 'diya-c7-3', classAssignment: 'CLASS 7', question: 'What does true "vinamrata" (humility) look like in leadership?', options: ['Leading by example while staying open to guidance', 'Leading by demanding obedience', 'Leading without listening to anyone', 'Avoiding responsibility altogether'], correctAnswer: 0 },
  { id: 'diya-c7-4', classAssignment: 'CLASS 7', question: 'Why is "shraddha" (faith rooted in understanding) valued over blind belief?', options: ['It comes from reflection and builds lasting conviction', 'It requires no thought at all', 'It is the same as blind belief', 'It has no role in growth'], correctAnswer: 0 },
  { id: 'diya-c7-5', classAssignment: 'CLASS 7', question: 'What is the Gurukul\'s view on using knowledge gained from study?', options: ['To serve others and grow in character, not just for personal gain', 'Only to score well in exams', 'Only to prove others wrong', 'It has no larger purpose'], correctAnswer: 0 },
];

function DiyaShape({ lit = false, small = false }: { lit?: boolean; small?: boolean }) {
  return <div className={`diya-shape ${lit ? 'lit' : ''} ${small ? 'small' : ''}`} aria-hidden="true"><span className="diya-aura" /><span className="diya-flame"><i /></span><span className="diya-bowl"><b /></span><span className="diya-base" /></div>;
}

function DiyaClassCard({ item, state, available, required, onOpen, onReset }: { item: typeof diyaClasses[number]; state: DiyaClassState; available: number; required: number; onOpen: () => void; onReset: () => void }) {
  const ready = available >= required;
  return <article className={`diya-class-card ${state.status} ${!ready ? 'needs-setup' : ''}`} data-testid={`card-diya-${item.id.toLowerCase().replace(' ', '-')}`}><div className="diya-class-top"><span className="diya-class-roman">{item.roman}</span><span className="mono">{item.id}</span><span className="diya-status-dot" /></div><DiyaShape lit={state.status === 'lit'} small /><div className="diya-class-name">{item.quality}</div><div className="diya-class-status">{diyaStatusLabel[state.status]} <span>· {state.correctIds.length}/{required} correct</span></div>{ready ? <button className="diya-class-open" onClick={onOpen} disabled={state.status === 'lit'} data-testid={`button-open-diya-${item.id.toLowerCase().replace(' ', '-')}`}>{state.status === 'lit' ? 'LIT' : state.status === 'unlocked' ? 'LIGHT DIYA' : state.status === 'in-progress' ? 'CONTINUE' : 'BEGIN'} <ArrowRight size={14} /></button> : <Link href="/admin" className="diya-class-open diya-setup-link" data-testid={`link-diya-setup-${item.id.toLowerCase().replace(' ', '-')}`}>ADMIN SETUP <ArrowRight size={14} /></Link>}{state.status !== 'not-started' && <button className="diya-class-reset" onClick={onReset} data-testid={`button-reset-diya-${item.id.toLowerCase().replace(' ', '-')}`}>Reset class</button>}</article>;
}

function DiyaChallenge({ classId, state, question, required, settings, onBack, onCorrect, onWrong, onRetryClass, onLight }: { classId: DiyaClassId; state: DiyaClassState; question: DiyaQuestion | undefined; required: number; settings: DiyaSettings; onBack: () => void; onCorrect: () => void; onWrong: () => void; onRetryClass: () => void; onLight: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'exhausted' | null>(null);
  if (state.status === 'unlocked') return <section className="diya-unlocked-panel fade-up"><div className="diya-lock-open"><Unlock size={34} /></div><div className="eyebrow">CLASS {classId.replace('CLASS ', '')} · COMPLETE</div><h2 className="display">THE DIVINE DIYA<br /><em>IS UNLOCKED</em></h2><p>Every answer has opened another link in the chain. The diya is waiting for its final light.</p><DiyaShape /><button className="button diya-button-gold" onClick={onLight} data-testid={`button-light-diya-${classId.toLowerCase().replace(' ', '-')}`}><Flame size={17} /> LIGHT THE DIYA</button><button className="diya-return-link" onClick={onBack} data-testid="button-return-diya-classes"><ArrowLeft size={15} /> Return to class lights</button></section>;
  if (!question) return <section className="diya-setup-panel fade-up"><div className="diya-setup-mark"><CircleHelp size={30} /></div><div className="eyebrow">ADMIN SETUP REQUIRED</div><h2 className="display">This class has no ready questions.</h2><p>The Divine Diya does not use demo questions. Ask an administrator to add at least {required} question{required === 1 ? '' : 's'} for {classId}, then return here.</p><Link href="/admin" className="button diya-button-gold" data-testid="link-diya-admin-setup"><SlidersHorizontal size={16} /> OPEN ADMIN SETUP</Link><button className="diya-return-link" onClick={onBack} data-testid="button-return-diya-setup"><ArrowLeft size={15} /> Return to class lights</button></section>;
  const answer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const correct = index === question.correctAnswer;
    if (correct) {
      setFeedback('correct');
      window.setTimeout(onCorrect, 420);
    } else if (settings.retryMode === 'limited' && state.attemptsRemaining <= 1) {
      setFeedback('exhausted');
      window.setTimeout(onRetryClass, 650);
    } else {
      setFeedback('wrong');
      window.setTimeout(() => { setSelected(null); setFeedback(null); onWrong(); }, 650);
    }
  };
  const attemptsLabel = settings.retryMode === 'unlimited' ? 'UNLIMITED RETRIES' : `${state.attemptsRemaining} ATTEMPTS LEFT`;
  return <section className={`diya-question-panel ${feedback === 'correct' ? 'answer-correct' : ''} ${feedback === 'wrong' ? 'answer-wrong' : ''} fade-up`}><div className="diya-question-head"><button className="diya-return-link" onClick={onBack} data-testid="button-back-diya-classes"><ArrowLeft size={15} /> Class lights</button><span className="diya-chain-label"><LockKeyhole size={14} /> CHAIN LINK {state.currentIndex + 1} / {required}</span><span className="mono">{attemptsLabel}</span></div><div className="diya-chain-track">{Array.from({ length: required }).map((_, index) => <span className={`${index < state.currentIndex ? 'done' : ''} ${index === state.currentIndex ? 'current' : ''}`} key={index}>{index < state.currentIndex ? <Check size={12} /> : <LockKeyhole size={11} />}</span>)}</div><div className="diya-question-copy"><div className="eyebrow">{classId} · QUESTION {state.currentIndex + 1}</div><h2 className="display">{question.question}</h2></div><div className="diya-answer-grid">{question.options.map((option, index) => <button key={`${question.id}-${index}`} className={`diya-answer ${selected === index ? feedback ?? '' : ''} ${selected !== null && index === question.correctAnswer && feedback === 'correct' ? 'right' : ''}`} onClick={() => answer(index)} disabled={selected !== null} data-testid={`button-diya-answer-${index}`}><span className="diya-answer-key">{String.fromCharCode(65 + index)}</span><span>{option}</span>{feedback === 'correct' && index === question.correctAnswer && <Check size={19} />}</button>)}</div><div className="diya-feedback" role="status">{feedback === 'correct' ? 'Correct. The next link in the chain is opening.' : feedback === 'wrong' ? 'Not this time. The diya stays patient — try this question again.' : feedback === 'exhausted' ? 'No attempts remain for this class. The chain is ready to begin again.' : 'Choose the answer that keeps the light moving.'}</div></section>;
}

function DiyaFinale({ onReset }: { onReset: () => void }) {
  return <main className="diya-page diya-finale fade-up"><div className="diya-particle diya-particle-a" /><div className="diya-particle diya-particle-b" /><div className="diya-particle diya-particle-c" /><div className="eyebrow">THE FIVE LIGHTS ARE ONE</div><h1 className="display">ज्ञान की ज्योति से<br /><em>प्रकाशित गुरुकुल</em></h1><p className="diya-finale-subtitle">Five classes. Five diyas. One Gurukul illuminated by the light of knowledge.</p><div className="diya-finale-row">{diyaClasses.map((item) => <div key={item.id}><DiyaShape lit small /><span className="mono">{item.id}</span></div>)}</div><div className="diya-finale-message"><div className="eyebrow">GRAND FINALE</div><h2 className="display">WELCOME GURU MAHARAJ</h2><p>The journey is complete. Keep this light in every answer, every practice, and every act of seva.</p></div><div className="diya-finale-actions"><button className="button diya-button-gold" onClick={onReset} data-testid="button-reset-all-diya-finale"><RotateCcw size={16} /> RESET ALL LIGHTS</button><Link href="/game" className="button diya-button-outline" data-testid="link-diya-back-games">BACK TO GAMES</Link></div></main>;
}

function Diya() {
  const [questions] = useLocalState<DiyaQuestion[]>('divine-diya-questions', defaultDiyaQuestions);
  const [settings] = useLocalState<DiyaSettings>('divine-diya-settings', defaultDiyaSettings);
  const [progress, setProgress] = useLocalState<DiyaProgress>('divine-diya-progress', defaultDiyaProgress);
  const [selectedClass, setSelectedClass] = useState<DiyaClassId | null>(null);
  const [notice, setNotice] = useState('');
  const sound = readStore('guru-sound-enabled', true);
  const litCount = diyaClasses.filter((item) => progress[item.id]?.status === 'lit').length;
  const getQuestions = (id: DiyaClassId) => questions.filter((question) => question.classAssignment === id && question.question.trim() && question.options.length === 4 && question.options.every((option) => option.trim()));
  const sequenceFor = (id: DiyaClassId) => {
    const list = getQuestions(id);
    const ids = list.map((question) => question.id);
    return settings.order === 'random' ? [...ids].sort(() => Math.random() - .5) : ids;
  };
  const selectedState = selectedClass ? progress[selectedClass] : null;
  const selectedQuestions = selectedClass ? getQuestions(selectedClass) : [];
  const selectedQuestion = selectedState?.questionIds.length ? selectedQuestions.find((question) => question.id === selectedState.questionIds[selectedState.currentIndex]) : undefined;
  const requiredFor = (id: DiyaClassId) => Math.max(1, Number(settings.required[id]) || 1);
  const resetClass = (id: DiyaClassId) => {
    if (!window.confirm(`Reset ${id} progress?`)) return;
    setProgress((current) => ({ ...current, [id]: createDiyaState() }));
    if (selectedClass === id) setSelectedClass(null);
  };
  const resetAll = () => {
    if (!window.confirm('Reset all Divine Diya lights and progress?')) return;
    setProgress(defaultDiyaProgress); setSelectedClass(null); setNotice('');
  };
  const openClass = (id: DiyaClassId) => {
    const required = requiredFor(id);
    const available = getQuestions(id).length;
    if (available < required) { setSelectedClass(id); return; }
    const current = progress[id];
    if (current.status === 'lit') return;
    if (current.status === 'not-started') {
      const ids = sequenceFor(id);
      setProgress((value) => ({ ...value, [id]: { ...createDiyaState(), status: 'in-progress', questionIds: ids, attemptsRemaining: settings.retryMode === 'limited' ? Math.max(1, settings.attempts) : 0 } }));
    }
    setSelectedClass(id); playTone(sound, 'tap');
  };
  const advance = () => {
    if (!selectedClass) return;
    setProgress((current) => {
      const item = current[selectedClass];
      const nextCorrect = [...item.correctIds, item.questionIds[item.currentIndex]];
      const required = requiredFor(selectedClass);
      if (nextCorrect.length >= required) return { ...current, [selectedClass]: { ...item, status: 'unlocked', correctIds: nextCorrect, currentIndex: item.currentIndex + 1, attemptsRemaining: 0 } };
      return { ...current, [selectedClass]: { ...item, currentIndex: item.currentIndex + 1, correctIds: nextCorrect, attemptsRemaining: settings.retryMode === 'limited' ? Math.max(1, settings.attempts) : 0 } };
    });
    playTone(sound, 'correct');
  };
  const wrong = () => {
    if (!selectedClass) return;
    if (settings.retryMode === 'limited') setProgress((current) => ({ ...current, [selectedClass]: { ...current[selectedClass], attemptsRemaining: Math.max(0, current[selectedClass].attemptsRemaining - 1) } }));
    playTone(sound, 'wrong');
  };
  const light = () => {
    if (!selectedClass) return;
    setProgress((current) => ({ ...current, [selectedClass]: { ...current[selectedClass], status: 'lit' } }));
    playTone(sound, 'finish'); setNotice(`${selectedClass} is now lit.`); setSelectedClass(null);
  };
  const allLit = litCount === diyaClasses.length;
  if (allLit) return <DiyaFinale onReset={resetAll} />;
  if (selectedClass && selectedState) {
    const currentRequired = requiredFor(selectedClass);
    return <main className="diya-page diya-journey"><div className="diya-journey-backdrop" /><div className="diya-journey-top"><Link href="/diya" className="diya-brand-lock" data-testid="link-diya-home"><span className="diya-mark"><Flame size={19} /></span><span><strong>THE DIVINE DIYA</strong><small>SHREE SWAMINARAYAN GURUKUL</small></span></Link><span className="diya-journey-progress">{litCount} / 5 LIT</span></div><div className="diya-journey-content"><DiyaChallenge classId={selectedClass} state={selectedState} question={selectedQuestion} required={currentRequired} settings={settings} onBack={() => setSelectedClass(null)} onCorrect={() => advance()} onWrong={wrong} onRetryClass={() => { setProgress((current) => ({ ...current, [selectedClass]: createDiyaState() })); setSelectedClass(null); setNotice('Attempts ended. Start this class again when you are ready.'); playTone(sound, 'wrong'); }} onLight={light} /></div>{notice && <div className="diya-toast" role="status">{notice}</div>}</main>;
  }
  return <main className="diya-page diya-landing"><div className="diya-stars"><span /><span /><span /><span /><span /></div><div className="diya-landing-top"><div><div className="diya-kicker">SHREE SWAMINARAYAN GURUKUL</div><h1 className="display">THE DIVINE <em>DIYA</em></h1><p className="diya-hindi">ज्ञान की ज्योति प्रज्वलित करो</p><p className="diya-lead">A five-class journey of attention, courage, and learning. Answer the questions prepared by your Admin team, unlock every chain, and light the Gurukul together.</p><div className="diya-landing-actions"><button className="button diya-button-gold" onClick={() => openClass(diyaClasses.find((item) => progress[item.id]?.status !== 'lit')?.id ?? 'CLASS 3')} data-testid="button-start-diya"><Flame size={17} /> START THE JOURNEY</button><button className="button diya-button-outline" onClick={() => document.getElementById('diya-classes')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-select-diya-class"><ListRestart size={16} /> SELECT CLASS</button><button className="diya-fullscreen-button" onClick={() => document.documentElement.requestFullscreen?.()} data-testid="button-diya-fullscreen"><Expand size={15} /> FULLSCREEN</button></div></div><div className="diya-hero-lamp"><div className="diya-chain chain-left" /><div className="diya-chain chain-right" /><DiyaShape /><div className="diya-lock-seal"><LockKeyhole size={28} /></div><div className="diya-hero-caption">THE LIGHT AWAITS<br /><span>CLASSROOMS 03 — 07</span></div></div></div><section className="diya-class-section" id="diya-classes"><div className="diya-section-head"><div><div className="eyebrow">SELECT CLASS</div><h2 className="display">Five links in one chain.</h2></div><div className="diya-overall-progress"><span><strong>{litCount}</strong> / 5 classes lit</span><i><b style={{ width: `${(litCount / 5) * 100}%` }} /></i></div></div><div className="diya-chain-rule"><span /><span /><span /><span /><span /></div><div className="diya-class-grid">{diyaClasses.map((item) => <DiyaClassCard key={item.id} item={item} state={progress[item.id] ?? createDiyaState()} available={getQuestions(item.id).length} required={requiredFor(item.id)} onOpen={() => openClass(item.id)} onReset={() => resetClass(item.id)} />)}</div><div className="diya-admin-note"><SlidersHorizontal size={17} /><span><strong>Questions are prepared in Admin.</strong> Every class card stays quiet until its own Divine Diya question bank is ready.</span><Link href="/admin" data-testid="link-diya-admin-from-landing">OPEN ADMIN <ArrowRight size={14} /></Link></div></section><div className="diya-landing-footer"><span className="mono">DIVINE DIYA · OFFLINE GURUKUL EXPERIENCE</span>{litCount > 0 && <button className="diya-reset-all" onClick={resetAll} data-testid="button-reset-all-diya">Reset all progress</button>}</div></main>;
}

function Leaderboard() {
  const [competition] = useLocalState<Competition>('guru-competition', defaultCompetition);
  const ranking = useMemo(() => [...classNames].sort((a, b) => competition.scores[b] - competition.scores[a]), [competition.scores]);
  const totalQuestions = competition.scoreHistory.length;
  return <main><div className="page-header"><div><div className="eyebrow">Live · updates locally</div><h1 className="display">Class leaderboard</h1></div><p>Every answer is recorded on this device. The order changes as each class takes its turn.</p></div><section className="leaderboard"><div className="panel rank-list">{ranking.map((name, index) => <div className={`rank-row rank-${index + 1}`} key={name} data-testid={`row-ranking-${name.replace(' ', '-').toLowerCase()}`}><div className="rank-no">{String(index + 1).padStart(2, '0')}</div><div><div className="rank-name">{name}</div><div className="rank-caption">{index === 0 && competition.scores[name] > 0 ? 'Leading with attention' : 'Ready for the next round'}</div></div><div className="rank-score">{competition.scores[name]} pts</div></div>)}<div className="empty-state" style={{ paddingBottom: 8 }}><span className="mono">{totalQuestions ? `${totalQuestions} answers recorded` : 'The first answer is waiting'}</span></div></div><aside><div className="stat-card"><div className="eyebrow" style={{ color: '#dca847' }}>At a glance</div><h3>The room is listening.</h3><div className="stat-line"><span>Current round</span><strong>{Math.min(competition.questionIndex + 1, 7)} / 7</strong></div><div className="stat-line"><span>Answers recorded</span><strong>{totalQuestions}</strong></div><div className="stat-line"><span>Status</span><strong>{competition.gameStatus === 'active' ? 'LIVE' : competition.gameStatus === 'finished' ? 'COMPLETE' : 'READY'}</strong></div></div><Link href="/game" className="button button-primary" style={{ width: '100%', marginTop: 12 }} data-testid="button-open-game">Open game <ArrowRight size={16} /></Link></aside></section></main>;
}

function Admin() {
  const [gurus, setGurus] = useLocalState('guru-entries-v2', portraits);
  const [questions, setQuestions] = useLocalState<Question[]>('guru-questions-v4', initialQuestions);
  const [diyaQuestions, setDiyaQuestions] = useLocalState<DiyaQuestion[]>('divine-diya-questions', defaultDiyaQuestions);
  const [diyaSettings, setDiyaSettings] = useLocalState<DiyaSettings>('divine-diya-settings', defaultDiyaSettings);
  const [diyaProgress, setDiyaProgress] = useLocalState<DiyaProgress>('divine-diya-progress', defaultDiyaProgress);
  const [competition, setCompetition] = useLocalState<Competition>('guru-competition', defaultCompetition);
  const [tugSettings, setTugSettings] = useLocalState<TugOfWarSettings>('tug-of-war-settings', defaultTugOfWarSettings);
  const [vaultProgress, setVaultProgress] = useLocalState<VaultProgressMap>('vaultProgress', defaultVaultProgress);
  const [vaultChallengeState, setVaultChallengeState] = useLocalState<VaultChallengeState>('vaultChallengeState', defaultVaultChallengeState);
  const [vaultFinalState, setVaultFinalState] = useLocalState('vaultFinalState', false);
  const [vaultPathSteps, setVaultPathSteps] = useLocalState<VaultPathStep[]>(VAULT_PATH_STEPS_KEY, defaultVaultPathSteps);
  const [vaultRiddles, setVaultRiddles] = useLocalState<VaultRiddleItem[]>(VAULT_RIDDLES_KEY, defaultVaultRiddles);
  const [vaultTrialStages, setVaultTrialStages] = useLocalState<VaultTrialStage[]>(VAULT_TRIAL_STAGES_KEY, defaultVaultTrialStages);
  const [sound, setSound] = useLocalState('guru-sound-enabled', true);
  const [tab, setTab] = useState<'overview' | 'gurus' | 'questions' | 'diya' | 'vault' | 'controls'>('overview');
  const [selectedClass, setSelectedClass] = useState(classNames[0]);
  const [diyaFilterClass, setDiyaFilterClass] = useState<'ALL' | DiyaClassId>('ALL');
  const [editingGuru, setEditingGuru] = useState<GuruEntry | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingDiyaQuestion, setEditingDiyaQuestion] = useState<DiyaQuestion | null>(null);
  const [editingPathStep, setEditingPathStep] = useState<VaultPathStep | null>(null);
  const [editingRiddle, setEditingRiddle] = useState<VaultRiddleItem | null>(null);
  const [editingTrialStage, setEditingTrialStage] = useState<VaultTrialStage | null>(null);
  const [notice, setNotice] = useState('');
  const notify = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 2300); };
  const resetCompetition = () => {
    if (!window.confirm('Reset the entire competition? This will clear every class score and score history.')) return;
    setCompetition({ ...defaultCompetition, soundEnabled: sound }); notify('Competition reset for a fresh round.');
  };
  const addGuru = () => setEditingGuru({ id: `guru-${Date.now()}`, image: portraits[0].image, name: '', subtitle: 'Swami Ji', order: gurus.length + 1 });
  const saveGuru = (guru: GuruEntry) => { setGurus(gurus.some((entry) => entry.id === guru.id) ? gurus.map((entry) => entry.id === guru.id ? guru : entry) : [...gurus, guru]); setEditingGuru(null); notify('Guru entry saved.'); };
  const deleteGuru = (id: string) => { if (!window.confirm('Remove this Guru Parampara entry?')) return; setGurus(gurus.filter((entry) => entry.id !== id)); notify('Guru entry removed.'); };
   const addQuestion = () => setEditingQuestion({ id: `question-${Date.now()}`, image: portraits[0].image, question: '', options: ['', '', '', ''], correctAnswer: 0, points: 20, classAssignment: classNames[questions.length % 5], verified: false, category: 'Guru Parampara', subject: 'Gurukul', difficulty: 'Medium', explanation: '' });
  const saveQuestion = (question: Question) => { setQuestions(questions.some((entry) => entry.id === question.id) ? questions.map((entry) => entry.id === question.id ? question : entry) : [...questions, question]); setEditingQuestion(null); notify('Question saved.'); };
  const deleteQuestion = (id: string) => { if (!window.confirm('Remove this question from the question bank?')) return; setQuestions(questions.filter((entry) => entry.id !== id)); notify('Question removed.'); };
  const questionDefaults = { image: portraits[0].image, category: 'Tug of War' as Question['category'], subject: 'Gurukul', difficulty: 'Medium' as QuizDifficulty, points: 1, verified: false, classAssignment: classNames[0], explanation: '' };
  const importQuestionsFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawList: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { questions?: unknown[] })?.questions) ? (parsed as { questions: unknown[] }).questions : [];
        if (!rawList.length) { notify('No questions found in that JSON file.'); return; }
        const existingIds = new Set(questions.map((entry) => entry.id));
        let skipped = 0;
        const imported: Question[] = [];
        rawList.forEach((raw, index) => {
          const item = raw as Partial<Question>;
          if (!item || typeof item.question !== 'string' || !item.question.trim() || !Array.isArray(item.options) || item.options.length < 2) { skipped += 1; return; }
          let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `imported-${Date.now()}-${index}`;
          while (existingIds.has(id)) id = `${id}-copy`;
          existingIds.add(id);
          imported.push({
            id,
            image: typeof item.image === 'string' && item.image ? item.image : questionDefaults.image,
            question: item.question,
            options: item.options.map((option) => String(option)),
            correctAnswer: typeof item.correctAnswer === 'number' && item.correctAnswer >= 0 && item.correctAnswer < item.options.length ? item.correctAnswer : 0,
            points: typeof item.points === 'number' ? item.points : questionDefaults.points,
            classAssignment: typeof item.classAssignment === 'string' && classNames.includes(item.classAssignment) ? item.classAssignment : questionDefaults.classAssignment,
            verified: typeof item.verified === 'boolean' ? item.verified : questionDefaults.verified,
            category: item.category === 'Guru Parampara' || item.category === 'Tug of War' ? item.category : questionDefaults.category,
            subject: typeof item.subject === 'string' && item.subject ? item.subject : questionDefaults.subject,
            difficulty: item.difficulty === 'Easy' || item.difficulty === 'Medium' || item.difficulty === 'Hard' ? item.difficulty : questionDefaults.difficulty,
            explanation: typeof item.explanation === 'string' ? item.explanation : questionDefaults.explanation,
          });
        });
        if (!imported.length) { notify('No valid questions found in that file.'); return; }
        setQuestions([...questions, ...imported]);
        notify(`Imported ${imported.length} question${imported.length === 1 ? '' : 's'}.${skipped ? ` Skipped ${skipped} invalid entr${skipped === 1 ? 'y' : 'ies'}.` : ''}`);
      } catch { notify('That file is not valid JSON.'); }
    };
    reader.readAsText(file);
  };
  const exportQuestionsFile = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'guru-questions.json'; link.click();
    URL.revokeObjectURL(url);
  };
  const addPathStep = () => setEditingPathStep({ id: `path-${Date.now()}`, prompt: '', choices: ['', '', ''], correctIndex: 0 });
  const savePathStep = (item: VaultPathStep) => { setVaultPathSteps(vaultPathSteps.some((entry) => entry.id === item.id) ? vaultPathSteps.map((entry) => entry.id === item.id ? item : entry) : [...vaultPathSteps, item]); setEditingPathStep(null); notify('Dharma Path step saved.'); };
  const deletePathStep = (id: string) => { if (!window.confirm('Remove this path step?')) return; setVaultPathSteps(vaultPathSteps.filter((entry) => entry.id !== id)); notify('Path step removed.'); };
  const addRiddle = () => setEditingRiddle({ id: `riddle-${Date.now()}`, riddle: '', hint: '', options: ['', '', '', ''], correctIndex: 0 });
  const saveRiddle = (item: VaultRiddleItem) => { setVaultRiddles(vaultRiddles.some((entry) => entry.id === item.id) ? vaultRiddles.map((entry) => entry.id === item.id ? item : entry) : [...vaultRiddles, item]); setEditingRiddle(null); notify('Riddle saved.'); };
  const deleteRiddle = (id: string) => { if (!window.confirm('Remove this riddle?')) return; setVaultRiddles(vaultRiddles.filter((entry) => entry.id !== id)); notify('Riddle removed.'); };
  const addTrialStage = () => setEditingTrialStage({ id: `trial-${Date.now()}`, label: '', prompt: '', choices: ['', '', ''], correctIndex: 0 });
  const saveTrialStage = (item: VaultTrialStage) => { setVaultTrialStages(vaultTrialStages.some((entry) => entry.id === item.id) ? vaultTrialStages.map((entry) => entry.id === item.id ? item : entry) : [...vaultTrialStages, item]); setEditingTrialStage(null); notify('Final Trial stage saved.'); };
  const deleteTrialStage = (id: string) => { if (!window.confirm('Remove this trial stage?')) return; setVaultTrialStages(vaultTrialStages.filter((entry) => entry.id !== id)); notify('Trial stage removed.'); };
  const addDiyaQuestion = () => setEditingDiyaQuestion({ id: `diya-question-${Date.now()}`, classAssignment: 'CLASS 3', question: '', options: ['', '', '', ''], correctAnswer: 0 });
  const saveDiyaQuestion = (question: DiyaQuestion) => { setDiyaQuestions(diyaQuestions.some((entry) => entry.id === question.id) ? diyaQuestions.map((entry) => entry.id === question.id ? question : entry) : [...diyaQuestions, question]); setEditingDiyaQuestion(null); notify('Divine Diya question saved.'); };
  const deleteDiyaQuestion = (id: string) => { if (!window.confirm('Remove this Divine Diya question?')) return; setDiyaQuestions(diyaQuestions.filter((entry) => entry.id !== id)); notify('Divine Diya question removed.'); };
  const resetDiyaClass = (id: DiyaClassId) => { if (!window.confirm(`Reset ${id} Divine Diya progress?`)) return; setDiyaProgress((current) => ({ ...current, [id]: createDiyaState() })); notify(`${id} Divine Diya progress reset.`); };
  const resetAllDiya = () => { if (!window.confirm('Reset all Divine Diya progress?')) return; setDiyaProgress(defaultDiyaProgress); notify('All Divine Diya progress reset.'); };
  const resetVaultClass = (id: VaultClassId) => { if (!window.confirm(`Reset ${id} vault progress?`)) return; setVaultProgress({ ...vaultProgress, [id]: { status: 'locked', completed: false } }); if (vaultChallengeState.activeClass === id) setVaultChallengeState({ ...vaultChallengeState, activeClass: null }); notify(`${id} vault progress reset.`); };
  const resetAllVault = () => { if (!window.confirm('Reset all Gurukul Vault progress? This clears every unlocked lock.')) return; setVaultProgress(defaultVaultProgress); setVaultChallengeState(defaultVaultChallengeState); setVaultFinalState(false); notify('All vault progress reset.'); };
  const moveGuru = (index: number, direction: -1 | 1) => { const next = [...gurus].sort((a, b) => a.order - b.order); const swap = index + direction; if (swap < 0 || swap >= next.length) return; [next[index], next[swap]] = [next[swap], next[index]]; setGurus(next.map((guru, i) => ({ ...guru, order: i + 1 }))); };
  const updateCompetition = (updater: (current: Competition) => Competition) => setCompetition(updater(competition));
  const applyManualScore = (amount: number) => {
    const previousScore = competition.scores[selectedClass] ?? 0;
    const newScore = Math.max(0, previousScore + amount);
    const record: ScoreHistory = {
      id: `${Date.now()}`, questionIndex: competition.questionIndex, className: selectedClass,
      points: amount, action: 'Judge adjustment', previousScore, newScore, at: new Date().toISOString(),
    };
    setCompetition({ ...competition, scores: { ...competition.scores, [selectedClass]: newScore }, scoreHistory: [...competition.scoreHistory, record] });
    notify(`${selectedClass}: ${amount >= 0 ? '+' : ''}${amount} points recorded.`);
  };
  const undoLastScore = () => {
    const last = [...competition.scoreHistory].reverse().find((record) => record.action !== 'Undo');
    if (!last) { notify('There is no score action to undo.'); return; }
    const previousScore = last.previousScore ?? Math.max(0, (competition.scores[last.className] ?? 0) - last.points);
    const newScore = previousScore;
    const undoRecord: ScoreHistory = {
      id: `${Date.now()}`, questionIndex: competition.questionIndex, className: last.className,
      points: newScore - (competition.scores[last.className] ?? 0), action: 'Undo', previousScore: competition.scores[last.className] ?? 0,
      newScore, at: new Date().toISOString(),
    };
    setCompetition({ ...competition, scores: { ...competition.scores, [last.className]: newScore }, scoreHistory: [...competition.scoreHistory, undoRecord] });
    notify(`Undid the last score action for ${last.className}.`);
  };
  const moveQuestion = (direction: -1 | 1) => {
    const nextIndex = Math.min(Math.max(competition.questionIndex + direction, 0), Math.max(questions.length - 1, 0));
    setCompetition({ ...competition, questionIndex: nextIndex });
  };
  return <main><div className="page-header"><div><div className="eyebrow"><LockKeyhole size={12} style={{ verticalAlign: 'middle' }} /> private controls</div><h1 className="display">Admin studio</h1></div><p>Prepare the gallery, tune the questions, and hand the screen to the next class.</p></div><div className="admin-layout"><div className="panel admin-nav"><button className={`admin-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')} data-testid="tab-overview"><LayoutGrid size={15} /> Overview</button><button className={`admin-tab ${tab === 'gurus' ? 'active' : ''}`} onClick={() => setTab('gurus')} data-testid="tab-gurus"><ShieldCheck size={15} /> Guru entries</button><button className={`admin-tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')} data-testid="tab-questions"><CircleHelp size={15} /> Questions</button><button className={`admin-tab ${tab === 'diya' ? 'active' : ''}`} onClick={() => setTab('diya')} data-testid="tab-diya"><Flame size={15} /> Divine Diya</button><button className={`admin-tab ${tab === 'vault' ? 'active' : ''}`} onClick={() => setTab('vault')} data-testid="tab-vault"><LockKeyhole size={15} /> Gurukul Vault</button><button className={`admin-tab ${tab === 'controls' ? 'active' : ''}`} onClick={() => setTab('controls')} data-testid="tab-controls"><SlidersHorizontal size={15} /> Controls</button></div><div className="admin-content">
      {tab === 'overview' && <div className="fade-up"><div className="admin-heading"><h2>Tonight's board</h2><Link href="/game" className="button button-primary" data-testid="button-preview-game">Preview game <ArrowRight size={15} /></Link></div><div className="form-grid"><div className="panel"><div className="eyebrow">Gallery</div><h3 className="display" style={{ fontSize: '2.6rem', margin: '14px 0 5px' }}>{gurus.length}</h3><p style={{ color: '#75847b', fontSize: '.78rem' }}>Portrait entries ready for the home gallery.</p><button className="button button-quiet" onClick={() => setTab('gurus')} data-testid="button-manage-gurus">Manage entries</button></div><div className="panel"><div className="eyebrow">Question bank</div><h3 className="display" style={{ fontSize: '2.6rem', margin: '14px 0 5px' }}>{questions.length}</h3><p style={{ color: '#75847b', fontSize: '.78rem' }}>Questions rotate through Classes 3–7.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button className="button button-quiet" onClick={() => setTab('questions')} data-testid="button-manage-questions">Manage questions</button><button className="button button-primary" onClick={addQuestion} data-testid="button-add-question-overview"><Plus size={15} /> Add question</button></div></div><div className="panel"><div className="eyebrow">Quiz Tug of War</div><h3 className="display" style={{ fontSize: '2.6rem', margin: '14px 0 5px' }}>{questions.filter((question) => question.category === 'Tug of War').length}</h3><p style={{ color: '#75847b', fontSize: '.78rem' }}>Live two-student game questions.</p><Link className="button button-quiet" href="/tug-of-war" data-testid="button-preview-tug-of-war">Open game</Link></div><div className="panel"><div className="eyebrow">Sound effects</div><h3 className="display" style={{ fontSize: '2.6rem', margin: '14px 0 5px' }}>{sound ? 'On' : 'Off'}</h3><p style={{ color: '#75847b', fontSize: '.78rem' }}>Generated browser tones for touch feedback.</p><button className="button button-quiet" onClick={() => { setSound(!sound); notify(sound ? 'Sound effects muted.' : 'Sound effects enabled.'); }} data-testid="button-toggle-admin-sound">{sound ? <Volume2 size={15} /> : <VolumeX size={15} />} Toggle sound</button></div></div></div>}
    {tab === 'gurus' && <div className="fade-up"><div className="admin-heading"><h2>Guru entries</h2><button className="button button-primary" onClick={addGuru} data-testid="button-add-guru"><Plus size={16} /> Add entry</button></div><div className="panel">{[...gurus].sort((a, b) => a.order - b.order).map((guru, index) => <div className="entry-row" key={guru.id}><img className="entry-thumb" src={guru.image} alt="" /><div><div className="entry-name">{guru.name || 'Untitled entry'}</div><div className="entry-sub">{guru.subtitle}</div></div><div className="entry-sub">Position {index + 1}</div><div className="row-actions"><button className="small-button" onClick={() => moveGuru(index, -1)} aria-label="Move entry up" data-testid={`button-guru-up-${guru.id}`}><ChevronUp size={15} /></button><button className="small-button" onClick={() => moveGuru(index, 1)} aria-label="Move entry down" data-testid={`button-guru-down-${guru.id}`}><ChevronDown size={15} /></button><button className="small-button" onClick={() => setEditingGuru(guru)} aria-label="Edit entry" data-testid={`button-guru-edit-${guru.id}`}><Edit3 size={15} /></button><button className="small-button danger" onClick={() => deleteGuru(guru.id)} aria-label="Delete entry" data-testid={`button-guru-delete-${guru.id}`}><Trash2 size={15} /></button></div></div>)}{!gurus.length && <div className="empty-state">No entries. Add the first portrait above.</div>}</div></div>}
     {tab === 'questions' && <div className="fade-up"><div className="admin-heading"><div><h2>Question bank</h2><p className="admin-section-description">Works for both Guru Parampara and Quiz Tug of War — set the "Game category" on each question. Import a JSON file to bulk-add questions instead of one at a time.</p></div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="button button-quiet" onClick={exportQuestionsFile} data-testid="button-export-questions"><Save size={15} /> Export JSON</button><label className="button button-quiet" style={{ cursor: 'pointer' }}><Plus size={15} /> Import JSON<input type="file" accept="application/json,.json" onChange={importQuestionsFile} style={{ display: 'none' }} data-testid="input-import-questions" /></label><button className="button button-primary" onClick={addQuestion} data-testid="button-add-question"><Plus size={16} /> Add question</button></div></div><div className="panel empty-state" style={{ marginBottom: 14, textAlign: 'left', padding: '14px 18px' }}><strong>JSON format:</strong> an array of objects like <code>{'{'}"question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "category": "Tug of War", "classAssignment": "CLASS 4", "difficulty": "Easy", "points": 1{'}'}</code>. Missing fields fall back to sensible defaults.</div><div className="panel">{questions.map((question, index) => <div className="entry-row" key={question.id}><div className="rank-no" style={{ fontSize: '1.35rem' }}>{String(index + 1).padStart(2, '0')}</div><div><div className="entry-name">{question.question || 'Untitled question'}</div><div className="entry-sub">{question.category} · {question.classAssignment} · {question.points} points</div></div><div className="entry-sub">{question.verified ? 'Verified' : 'Needs review'}</div><div className="row-actions"><button className="small-button" onClick={() => setEditingQuestion(question)} aria-label="Edit question" data-testid={`button-question-edit-${question.id}`}><Edit3 size={15} /></button><button className="small-button danger" onClick={() => deleteQuestion(question.id)} aria-label="Delete question" data-testid={`button-question-delete-${question.id}`}><Trash2 size={15} /></button></div></div>)}{!questions.length && <div className="empty-state">No questions. Add one to unlock the game.</div>}</div></div>}
      {tab === 'diya' && <div className="fade-up diya-admin"><div className="admin-heading"><div><h2>Divine Diya</h2><p className="admin-section-description">A separate question bank for the five-class diya journey. Changes save immediately on this device.</p></div><button className="button button-primary" onClick={addDiyaQuestion} data-testid="button-add-diya-question"><Plus size={16} /> Add diya question</button></div><div className="diya-admin-summary"><div className="panel"><div className="eyebrow">Total diya questions</div><strong>{diyaQuestions.length}</strong><span>Separate from Know Your Guru.</span></div><div className="panel"><div className="eyebrow">Classes ready</div><strong>{diyaClasses.filter((item) => diyaQuestions.filter((question) => question.classAssignment === item.id).length >= Math.max(1, diyaSettings.required[item.id])).length} / 5</strong><span>Meet each required count.</span></div><div className="panel"><div className="eyebrow">Diyas lit</div><strong>{diyaClasses.filter((item) => diyaProgress[item.id]?.status === 'lit').length} / 5</strong><span>Persistent player progress.</span></div></div><section className="panel diya-admin-progress"><div className="admin-heading"><h3>Class progress</h3><button className="button button-danger" onClick={resetAllDiya} data-testid="button-admin-reset-all-diya"><RotateCcw size={15} /> Reset all Diya progress</button></div><div className="diya-admin-class-grid">{diyaClasses.map((item) => { const count = diyaQuestions.filter((question) => question.classAssignment === item.id).length; const state = diyaProgress[item.id]; return <div className="diya-admin-class-row" key={item.id}><span className="mono">{item.id}</span><span>{count} questions · {diyaSettings.required[item.id]} required</span><strong className={state.status}>{diyaStatusLabel[state.status]}</strong><button className="small-button danger" onClick={() => resetDiyaClass(item.id)} aria-label={`Reset ${item.id}`} data-testid={`button-admin-reset-diya-${item.id.toLowerCase().replace(' ', '-')}`}><RotateCcw size={14} /></button></div>; })}</div></section><section className="panel diya-admin-settings"><div className="eyebrow">Journey settings</div><h3>How the chains behave</h3><div className="diya-settings-grid"><div className="field"><label>Question order</label><select value={diyaSettings.order} onChange={(event) => setDiyaSettings({ ...diyaSettings, order: event.target.value as DiyaSettings['order'] })} data-testid="select-diya-order"><option value="sequential">Sequential</option><option value="random">Random</option></select></div><div className="field"><label>Wrong answer mode</label><select value={diyaSettings.retryMode} onChange={(event) => setDiyaSettings({ ...diyaSettings, retryMode: event.target.value as DiyaSettings['retryMode'] })} data-testid="select-diya-retry-mode"><option value="unlimited">Unlimited retries</option><option value="limited">Limited attempts</option></select></div>{diyaSettings.retryMode === 'limited' && <div className="field"><label>Attempts per question</label><input type="number" min="1" max="9" value={diyaSettings.attempts} onChange={(event) => setDiyaSettings({ ...diyaSettings, attempts: Math.min(9, Math.max(1, Number(event.target.value) || 1)) })} data-testid="input-diya-attempts" /></div>}</div><div className="diya-required-grid"><div className="eyebrow">Required correct answers per class</div>{diyaClasses.map((item) => <label className="diya-required-field" key={item.id}><span>{item.id}</span><input type="number" min="1" max="99" value={diyaSettings.required[item.id]} onChange={(event) => setDiyaSettings({ ...diyaSettings, required: { ...diyaSettings.required, [item.id]: Math.min(99, Math.max(1, Number(event.target.value) || 1)) } })} data-testid={`input-diya-required-${item.id.toLowerCase().replace(' ', '-')}`} /></label>)}</div></section><section className="panel diya-admin-questions"><div className="admin-heading"><div><h3>Diya question bank</h3><span className="entry-sub">Filter, edit, or remove questions by class.</span></div><select className="diya-filter-select" value={diyaFilterClass} onChange={(event) => setDiyaFilterClass(event.target.value as 'ALL' | DiyaClassId)} data-testid="select-diya-filter"><option value="ALL">All classes</option>{diyaClasses.map((item) => <option key={item.id}>{item.id}</option>)}</select></div>{diyaQuestions.filter((question) => diyaFilterClass === 'ALL' || question.classAssignment === diyaFilterClass).map((question, index) => <div className="entry-row diya-entry-row" key={question.id}><div className="rank-no" style={{ fontSize: '1.35rem' }}>{String(index + 1).padStart(2, '0')}</div><div><div className="entry-name">{question.question || 'Untitled diya question'}</div><div className="entry-sub">{question.classAssignment} · Correct option {String.fromCharCode(65 + question.correctAnswer)}</div></div><div className="entry-sub">{question.options.filter(Boolean).length} / 4 options</div><div className="row-actions"><button className="small-button" onClick={() => setEditingDiyaQuestion(question)} aria-label="Edit Diya question" data-testid={`button-diya-question-edit-${question.id}`}><Edit3 size={15} /></button><button className="small-button danger" onClick={() => deleteDiyaQuestion(question.id)} aria-label="Delete Diya question" data-testid={`button-diya-question-delete-${question.id}`}><Trash2 size={15} /></button></div></div>)}{!diyaQuestions.filter((question) => diyaFilterClass === 'ALL' || question.classAssignment === diyaFilterClass).length && <div className="empty-state"><Flame size={28} /><h3>No Divine Diya questions yet.</h3><p>Add questions here to make a class playable. The public game never uses fake questions.</p><button className="button button-primary" onClick={addDiyaQuestion} data-testid="button-add-first-diya-question"><Plus size={16} /> Add the first question</button></div>}</section></div>}
     {tab === 'vault' && <div className="fade-up"><div className="admin-heading"><div><h2>Gurukul Vault content</h2><p className="admin-section-description">Add as many entries as you like for Class 4, 6 and 7 — each playthrough randomly draws from the pool, so the chamber doesn't repeat the same content every time. Class 3 (memory) and Class 5 (sort) are fixed mini-games and don't use a question bank.</p></div></div>
       <section className="panel" style={{ marginBottom: 16 }}><div className="admin-heading"><div><div className="eyebrow">CLASS 4 · Dharma Path</div><h3 style={{ margin: '7px 0 0', color: '#244c42' }}>Path steps ({vaultPathSteps.length})</h3></div><button className="button button-primary" onClick={addPathStep} data-testid="button-add-path-step"><Plus size={15} /> Add step</button></div>{vaultPathSteps.map((item, index) => <div className="entry-row" key={item.id}><div className="rank-no" style={{ fontSize: '1.1rem' }}>{String(index + 1).padStart(2, '0')}</div><div><div className="entry-name">{item.prompt || 'Untitled step'}</div><div className="entry-sub">Correct: {item.choices[item.correctIndex] || '—'} · {item.choices.length} choices</div></div><div className="row-actions"><button className="small-button" onClick={() => setEditingPathStep(item)} aria-label="Edit step" data-testid={`button-path-step-edit-${item.id}`}><Edit3 size={15} /></button><button className="small-button danger" onClick={() => deletePathStep(item.id)} aria-label="Delete step" data-testid={`button-path-step-delete-${item.id}`}><Trash2 size={15} /></button></div></div>)}{!vaultPathSteps.length && <div className="empty-state">No path steps yet.</div>}</section>
       <section className="panel" style={{ marginBottom: 16 }}><div className="admin-heading"><div><div className="eyebrow">CLASS 6 · The Sealed Scroll</div><h3 style={{ margin: '7px 0 0', color: '#244c42' }}>Riddles ({vaultRiddles.length})</h3></div><button className="button button-primary" onClick={addRiddle} data-testid="button-add-riddle"><Plus size={15} /> Add riddle</button></div>{vaultRiddles.map((item, index) => <div className="entry-row" key={item.id}><div className="rank-no" style={{ fontSize: '1.1rem' }}>{String(index + 1).padStart(2, '0')}</div><div><div className="entry-name">{item.riddle || 'Untitled riddle'}</div><div className="entry-sub">Correct: {item.options[item.correctIndex] || '—'}</div></div><div className="row-actions"><button className="small-button" onClick={() => setEditingRiddle(item)} aria-label="Edit riddle" data-testid={`button-riddle-edit-${item.id}`}><Edit3 size={15} /></button><button className="small-button danger" onClick={() => deleteRiddle(item.id)} aria-label="Delete riddle" data-testid={`button-riddle-delete-${item.id}`}><Trash2 size={15} /></button></div></div>)}{!vaultRiddles.length && <div className="empty-state">No riddles yet.</div>}</section>
       <section className="panel"><div className="admin-heading"><div><div className="eyebrow">CLASS 7 · Final Trial</div><h3 style={{ margin: '7px 0 0', color: '#244c42' }}>Trial stages ({vaultTrialStages.length})</h3></div><button className="button button-primary" onClick={addTrialStage} data-testid="button-add-trial-stage"><Plus size={15} /> Add stage</button></div>{vaultTrialStages.map((item, index) => <div className="entry-row" key={item.id}><div className="rank-no" style={{ fontSize: '1.1rem' }}>{String(index + 1).padStart(2, '0')}</div><div><div className="entry-name">{item.label ? `${item.label} — ` : ''}{item.prompt || 'Untitled stage'}</div><div className="entry-sub">Correct: {item.choices[item.correctIndex] || '—'} · {item.choices.length} choices</div></div><div className="row-actions"><button className="small-button" onClick={() => setEditingTrialStage(item)} aria-label="Edit stage" data-testid={`button-trial-stage-edit-${item.id}`}><Edit3 size={15} /></button><button className="small-button danger" onClick={() => deleteTrialStage(item.id)} aria-label="Delete stage" data-testid={`button-trial-stage-delete-${item.id}`}><Trash2 size={15} /></button></div></div>)}{!vaultTrialStages.length && <div className="empty-state">No trial stages yet.</div>}</section>
     </div>}
     {tab === 'controls' && <div className="fade-up"><div className="admin-heading"><h2>Competition controls</h2><span className="class-pill">{competition.gameStatus.toUpperCase()}</span></div><div className="panel"><div className="admin-heading"><div><div className="eyebrow">Session control</div><h3 style={{ margin: '7px 0 0', color: '#244c42' }}>Hand-off ready</h3></div><button className="button button-danger" onClick={resetCompetition} data-testid="button-reset-competition"><RotateCcw size={15} /> Reset competition</button></div><div className="form-grid"><div className="field"><label>Current question</label><input value={competition.questionIndex + 1} readOnly /></div><div className="field"><label>Next class</label><input value={classNames[competition.questionIndex % 5]} readOnly /></div><div className="field"><label>Questions answered</label><input value={competition.scoreHistory.length} readOnly /></div><div className="field"><label>Judge class</label><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>{classNames.map((name) => <option key={name}>{name}</option>)}</select></div></div><div className="control-grid"><button className="button button-primary" onClick={() => updateCompetition((current) => ({ ...current, gameStatus: 'active' }))}>Start / resume</button><button className="button button-quiet" onClick={() => updateCompetition((current) => ({ ...current, gameStatus: 'paused' }))}>Pause timer</button><button className="button button-quiet" onClick={() => moveQuestion(-1)} disabled={!questions.length}>Previous question</button><button className="button button-quiet" onClick={() => moveQuestion(1)} disabled={!questions.length}>Next question</button><button className="button button-quiet" onClick={() => setSound(!sound)} data-testid="button-control-sound">{sound ? <Volume2 size={15} /> : <VolumeX size={15} />} {sound ? 'Sound enabled' : 'Sound muted'}</button></div><div className="score-controls"><div className="eyebrow">Score controls · {selectedClass}</div><div className="control-grid"><button className="button button-gold" onClick={() => applyManualScore(10)}>+10 points</button><button className="button button-gold" onClick={() => applyManualScore(20)}>+20 points</button><button className="button button-quiet" onClick={() => applyManualScore(-10)}>-10 points</button><button className="button button-quiet" onClick={undoLastScore}><RotateCcw size={15} /> Undo last score</button></div></div></div><div className="panel" style={{ marginTop: 18 }}><div className="admin-heading"><h3 style={{ margin: 0, color: '#244c42' }}>Score history</h3><ListRestart size={18} color="#ae741e" /></div>{competition.scoreHistory.length ? competition.scoreHistory.slice().reverse().map((record) => <div className="stat-line" key={record.id}><span>{record.className} · question {record.questionIndex + 1} · {record.action ?? 'Score action'}</span><strong>{record.points >= 0 ? '+' : ''}{record.points} pts</strong></div>) : <div className="empty-state">No answers have been recorded yet.</div>}</div></div>}
     {tab === 'controls' && <section className="panel tug-admin-panel"><div className="admin-heading"><div><div className="eyebrow">Quiz Tug of War</div><h3 style={{ margin: '7px 0 0', color: '#244c42' }}>Live game settings</h3></div><Link href="/tug-of-war" className="button button-quiet" data-testid="button-admin-open-tug-of-war">Open game <ArrowRight size={15} /></Link></div><label className="tug-admin-toggle"><input type="checkbox" checked={tugSettings.enabled} onChange={(event) => setTugSettings({ ...tugSettings, enabled: event.target.checked })} data-testid="checkbox-tug-enabled" /><span><strong>Enable Quiz Tug of War</strong><small>Allow the game to be started from its public game screen.</small></span></label><div className="form-grid"><div className="field"><label>Number of questions</label><input type="number" min="2" max="30" value={tugSettings.questionCount} onChange={(event) => setTugSettings({ ...tugSettings, questionCount: Math.min(30, Math.max(2, Number(event.target.value) || 2)) })} data-testid="input-tug-question-count" /></div><div className="field"><label>Timer duration (seconds)</label><input type="number" min="5" max="120" value={tugSettings.timerDuration} onChange={(event) => setTugSettings({ ...tugSettings, timerDuration: Math.min(120, Math.max(5, Number(event.target.value) || 5)) })} data-testid="input-tug-timer-duration" /></div><div className="field"><label>Question category</label><select value={tugSettings.category} onChange={(event) => setTugSettings({ ...tugSettings, category: event.target.value as TugOfWarSettings['category'] })} data-testid="select-tug-category"><option value="Tug of War">Tug of War</option></select></div><div className="field"><label>Class selection</label><select value={tugSettings.classSelection} onChange={(event) => setTugSettings({ ...tugSettings, classSelection: event.target.value as TugOfWarSettings['classSelection'] })} data-testid="select-tug-class">{['ALL', ...classNames].map((name) => <option key={name}>{name}</option>)}</select></div><div className="field"><label>Difficulty</label><select value={tugSettings.difficulty} onChange={(event) => setTugSettings({ ...tugSettings, difficulty: event.target.value as TugOfWarSettings['difficulty'] })} data-testid="select-tug-difficulty">{['ALL', 'Easy', 'Medium', 'Hard'].map((name) => <option key={name}>{name}</option>)}</select></div></div><label className="tug-admin-toggle"><input type="checkbox" checked={tugSettings.randomQuestions} onChange={(event) => setTugSettings({ ...tugSettings, randomQuestions: event.target.checked })} data-testid="checkbox-tug-random" /><span><strong>Random questions</strong><small>Shuffle the eligible bank at the start of every match.</small></span></label></section>}
     {tab === 'controls' && <section className="panel tug-admin-panel"><div className="admin-heading"><div><div className="eyebrow">Gurukul Vault</div><h3 style={{ margin: '7px 0 0', color: '#244c42' }}>Lock progress</h3></div><div style={{ display: 'flex', gap: 10 }}><Link href="/vault" className="button button-quiet" data-testid="button-admin-open-vault">Open vault <ArrowRight size={15} /></Link><button className="button button-danger" onClick={resetAllVault} data-testid="button-admin-reset-all-vault"><RotateCcw size={15} /> Reset all vault progress</button></div></div><div className="diya-admin-class-grid">{vaultClasses.map((item) => { const state = vaultProgress[item.id]; return <div className="diya-admin-class-row" key={item.id}><span className="mono">{item.id}</span><span>{item.title}</span><strong className={state.status}>{state.status === 'unlocked' ? 'Unlocked · complete' : state.status === 'in-progress' ? 'In progress' : 'Locked'}</strong><button className="small-button danger" onClick={() => resetVaultClass(item.id)} disabled={state.status === 'locked'} aria-label={`Reset ${item.id} vault progress`} data-testid={`button-admin-reset-vault-${item.id.toLowerCase().replace(' ', '-')}`}><RotateCcw size={14} /></button></div>; })}</div></section>}
     </div></div>{editingGuru && <GuruEditor guru={editingGuru} onSave={saveGuru} onClose={() => setEditingGuru(null)} />}{editingQuestion && <QuestionEditor question={editingQuestion} onSave={saveQuestion} onClose={() => setEditingQuestion(null)} />}{editingDiyaQuestion && <DiyaQuestionEditor question={editingDiyaQuestion} onSave={saveDiyaQuestion} onClose={() => setEditingDiyaQuestion(null)} />}{editingPathStep && <VaultPathStepEditor item={editingPathStep} onSave={savePathStep} onClose={() => setEditingPathStep(null)} />}{editingRiddle && <VaultRiddleEditor item={editingRiddle} onSave={saveRiddle} onClose={() => setEditingRiddle(null)} />}{editingTrialStage && <VaultTrialStageEditor item={editingTrialStage} onSave={saveTrialStage} onClose={() => setEditingTrialStage(null)} />}{notice && <div className="toast-note" role="status">{notice}</div>}</main>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(25,45,39,.45)', display: 'grid', placeItems: 'center', padding: 18 }}><div className="panel" style={{ maxWidth: 650, width: '100%', maxHeight: '92dvh', overflow: 'auto', position: 'relative' }}><button className="icon-button" onClick={onClose} aria-label="Close editor" style={{ position: 'absolute', right: 18, top: 18 }} data-testid="button-close-editor"><X size={16} /></button>{children}</div></div>;
}
function GuruEditor({ guru, onSave, onClose }: { guru: GuruEntry; onSave: (guru: GuruEntry) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(guru);
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  return <Modal onClose={onClose}><div className="eyebrow">Gallery editor</div><h2 className="display" style={{ color: '#244c42', margin: '9px 0 24px', fontSize: '2.4rem' }}>Guru entry</h2><div className="form-grid"><div className="field full"><label>Name</label><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Name as supplied and verified by administrator" data-testid="input-guru-name" /></div><div className="field"><label>Subtitle</label><input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} data-testid="input-guru-subtitle" /></div><div className="field"><label>Order</label><input type="number" value={draft.order} onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) || 1 })} data-testid="input-guru-order" /></div><div className="field full"><label>Use supplied portrait</label><select value={draft.image.startsWith('data:') ? '' : draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} data-testid="select-guru-image"><option value="">Uploaded image</option>{portraits.map((portrait) => <option key={portrait.id} value={portrait.image}>{portrait.name}</option>)}</select></div><div className="field full"><label>Upload a replacement image</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} data-testid="input-guru-image-upload" />{draft.image.startsWith('data:') && <img className="upload-preview" src={draft.image} alt="Uploaded preview" />}</div></div><div className="form-actions"><button className="button button-quiet" onClick={onClose} data-testid="button-cancel-guru">Cancel</button><button className="button button-primary" onClick={() => onSave(draft)} disabled={!draft.name.trim()} data-testid="button-save-guru"><Save size={15} /> Save entry</button></div></Modal>;
}
function QuestionEditor({ question, onSave, onClose }: { question: Question; onSave: (question: Question) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(question);
  const updateOption = (index: number, value: string) => setDraft({ ...draft, options: draft.options.map((option, optionIndex) => optionIndex === index ? value : option) });
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  return <Modal onClose={onClose}><div className="eyebrow">Question editor</div><h2 className="display" style={{ color: '#244c42', margin: '9px 0 24px', fontSize: '2.4rem' }}>Question card</h2><div className="form-grid"><div className="field full"><label>Question</label><textarea value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} placeholder="Write the prompt exactly as it should appear" data-testid="input-question-text" /></div><div className="field"><label>Game category</label><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Question['category'] })} data-testid="select-question-category"><option value="Guru Parampara">Guru Parampara</option><option value="Tug of War">Tug of War</option></select></div><div className="field"><label>Subject</label><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="e.g. Science" data-testid="input-question-subject" /></div><div className="field"><label>Difficulty</label><select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as QuizDifficulty })} data-testid="select-question-difficulty"><option>Easy</option><option>Medium</option><option>Hard</option></select></div><div className="field"><label>Class assignment</label><select value={draft.classAssignment} onChange={(event) => setDraft({ ...draft, classAssignment: event.target.value })} data-testid="select-question-class">{classNames.map((name) => <option key={name}>{name}</option>)}</select></div><div className="field full"><label>Explanation</label><textarea value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} placeholder="Optional explanation shown to the administrator after review" data-testid="input-question-explanation" /></div><div className="field full"><label>Use supplied portrait</label><select value={draft.image.startsWith('data:') ? '' : draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} data-testid="select-question-image"><option value="">Uploaded image</option>{portraits.map((portrait) => <option key={portrait.id} value={portrait.image}>{portrait.name}</option>)}</select></div><div className="field full"><label>Upload a question image</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} data-testid="input-question-image-upload" />{draft.image.startsWith('data:') && <img className="upload-preview" src={draft.image} alt="Uploaded preview" />}</div>{draft.options.map((option, index) => <div className="field" key={index}><label>Option {String.fromCharCode(65 + index)}</label><input value={option} onChange={(event) => updateOption(index, event.target.value)} data-testid={`input-question-option-${index}`} /></div>)}<div className="field"><label>Correct option</label><select value={draft.correctAnswer} onChange={(event) => setDraft({ ...draft, correctAnswer: Number(event.target.value) })} data-testid="select-question-correct">{draft.options.map((_, index) => <option key={index} value={index}>Option {String.fromCharCode(65 + index)}</option>)}</select></div><div className="field"><label>Points</label><input type="number" value={draft.points} onChange={(event) => setDraft({ ...draft, points: Number(event.target.value) || 0 })} data-testid="input-question-points" /></div><label style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#5b7068', fontSize: '.78rem' }}><input type="checkbox" checked={draft.verified} onChange={(event) => setDraft({ ...draft, verified: event.target.checked })} data-testid="checkbox-question-verified" /> Mark as reviewed</label></div><div className="form-actions"><button className="button button-quiet" onClick={onClose} data-testid="button-cancel-question">Cancel</button><button className="button button-primary" onClick={() => onSave(draft)} disabled={!draft.question.trim() || draft.options.some((option) => !option.trim())} data-testid="button-save-question"><Save size={15} /> Save question</button></div></Modal>;
}

function DiyaQuestionEditor({ question, onSave, onClose }: { question: DiyaQuestion; onSave: (question: DiyaQuestion) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(question);
  const updateOption = (index: number, value: string) => setDraft({ ...draft, options: draft.options.map((option, optionIndex) => optionIndex === index ? value : option) });
  return <Modal onClose={onClose}><div className="eyebrow">Divine Diya editor</div><h2 className="display" style={{ color: '#244c42', margin: '9px 0 24px', fontSize: '2.4rem' }}>Question card</h2><div className="form-grid"><div className="field full"><label>Class</label><select value={draft.classAssignment} onChange={(event) => setDraft({ ...draft, classAssignment: event.target.value as DiyaClassId })} data-testid="select-diya-question-class">{diyaClasses.map((item) => <option key={item.id}>{item.id}</option>)}</select></div><div className="field full"><label>Question</label><textarea value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} placeholder="Write a question for this class" data-testid="input-diya-question-text" /></div>{draft.options.map((option, index) => <div className="field" key={index}><label>Option {String.fromCharCode(65 + index)}</label><input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Answer option ${String.fromCharCode(65 + index)}`} data-testid={`input-diya-option-${index}`} /></div>)}<div className="field full"><label>Correct answer</label><select value={draft.correctAnswer} onChange={(event) => setDraft({ ...draft, correctAnswer: Number(event.target.value) })} data-testid="select-diya-correct-answer">{draft.options.map((_, index) => <option key={index} value={index}>Option {String.fromCharCode(65 + index)}</option>)}</select></div></div><div className="form-actions"><button className="button button-quiet" onClick={onClose} data-testid="button-cancel-diya-question">Cancel</button><button className="button button-primary" onClick={() => onSave(draft)} disabled={!draft.question.trim() || draft.options.length !== 4 || draft.options.some((option) => !option.trim())} data-testid="button-save-diya-question"><Save size={15} /> Save question</button></div></Modal>;
}

function VaultPathStepEditor({ item, onSave, onClose }: { item: VaultPathStep; onSave: (item: VaultPathStep) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(item);
  const updateChoice = (index: number, value: string) => setDraft({ ...draft, choices: draft.choices.map((choice, choiceIndex) => choiceIndex === index ? value : choice) });
  const addChoice = () => draft.choices.length < 4 && setDraft({ ...draft, choices: [...draft.choices, ''] });
  const removeChoice = (index: number) => draft.choices.length > 2 && setDraft({ ...draft, choices: draft.choices.filter((_, choiceIndex) => choiceIndex !== index), correctIndex: draft.correctIndex >= draft.choices.length - 1 ? 0 : draft.correctIndex });
  return <Modal onClose={onClose}><div className="eyebrow">CLASS 4 · Dharma Path</div><h2 className="display" style={{ color: '#244c42', margin: '9px 0 24px', fontSize: '2.2rem' }}>Path step</h2><div className="form-grid"><div className="field full"><label>Prompt</label><textarea value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} placeholder="What does the traveler face at this step?" data-testid="input-path-step-prompt" /></div>{draft.choices.map((choice, index) => <div className="field" key={index}><label>Choice {String.fromCharCode(65 + index)}{draft.choices.length > 2 && <button type="button" className="small-button danger" style={{ marginLeft: 8 }} onClick={() => removeChoice(index)} aria-label="Remove choice"><Trash2 size={12} /></button>}</label><input value={choice} onChange={(event) => updateChoice(index, event.target.value)} data-testid={`input-path-step-choice-${index}`} /></div>)}{draft.choices.length < 4 && <div className="field"><label>&nbsp;</label><button type="button" className="button button-quiet" onClick={addChoice} data-testid="button-path-step-add-choice"><Plus size={14} /> Add choice</button></div>}<div className="field"><label>Correct choice</label><select value={draft.correctIndex} onChange={(event) => setDraft({ ...draft, correctIndex: Number(event.target.value) })} data-testid="select-path-step-correct">{draft.choices.map((_, index) => <option key={index} value={index}>Choice {String.fromCharCode(65 + index)}</option>)}</select></div></div><div className="form-actions"><button className="button button-quiet" onClick={onClose} data-testid="button-cancel-path-step">Cancel</button><button className="button button-primary" onClick={() => onSave(draft)} disabled={!draft.prompt.trim() || draft.choices.some((choice) => !choice.trim())} data-testid="button-save-path-step"><Save size={15} /> Save step</button></div></Modal>;
}

function VaultRiddleEditor({ item, onSave, onClose }: { item: VaultRiddleItem; onSave: (item: VaultRiddleItem) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(item);
  const updateOption = (index: number, value: string) => setDraft({ ...draft, options: draft.options.map((option, optionIndex) => optionIndex === index ? value : option) });
  return <Modal onClose={onClose}><div className="eyebrow">CLASS 6 · The Sealed Scroll</div><h2 className="display" style={{ color: '#244c42', margin: '9px 0 24px', fontSize: '2.2rem' }}>Riddle</h2><div className="form-grid"><div className="field full"><label>Riddle</label><textarea value={draft.riddle} onChange={(event) => setDraft({ ...draft, riddle: event.target.value })} placeholder="Write the riddle text" data-testid="input-riddle-text" /></div>{draft.options.map((option, index) => <div className="field" key={index}><label>Option {String.fromCharCode(65 + index)}</label><input value={option} onChange={(event) => updateOption(index, event.target.value)} data-testid={`input-riddle-option-${index}`} /></div>)}<div className="field"><label>Correct option</label><select value={draft.correctIndex} onChange={(event) => setDraft({ ...draft, correctIndex: Number(event.target.value) })} data-testid="select-riddle-correct">{draft.options.map((_, index) => <option key={index} value={index}>Option {String.fromCharCode(65 + index)}</option>)}</select></div><div className="field full"><label>Hint</label><input value={draft.hint} onChange={(event) => setDraft({ ...draft, hint: event.target.value })} placeholder="Shown if the player taps 'Reveal one hint'" data-testid="input-riddle-hint" /></div></div><div className="form-actions"><button className="button button-quiet" onClick={onClose} data-testid="button-cancel-riddle">Cancel</button><button className="button button-primary" onClick={() => onSave(draft)} disabled={!draft.riddle.trim() || draft.options.some((option) => !option.trim())} data-testid="button-save-riddle"><Save size={15} /> Save riddle</button></div></Modal>;
}

function VaultTrialStageEditor({ item, onSave, onClose }: { item: VaultTrialStage; onSave: (item: VaultTrialStage) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(item);
  const updateChoice = (index: number, value: string) => setDraft({ ...draft, choices: draft.choices.map((choice, choiceIndex) => choiceIndex === index ? value : choice) });
  const addChoice = () => draft.choices.length < 4 && setDraft({ ...draft, choices: [...draft.choices, ''] });
  const removeChoice = (index: number) => draft.choices.length > 2 && setDraft({ ...draft, choices: draft.choices.filter((_, choiceIndex) => choiceIndex !== index), correctIndex: draft.correctIndex >= draft.choices.length - 1 ? 0 : draft.correctIndex });
  return <Modal onClose={onClose}><div className="eyebrow">CLASS 7 · Final Trial</div><h2 className="display" style={{ color: '#244c42', margin: '9px 0 24px', fontSize: '2.2rem' }}>Trial stage</h2><div className="form-grid"><div className="field"><label>Stage label</label><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="e.g. PATTERN" data-testid="input-trial-stage-label" /></div><div className="field full"><label>Prompt</label><textarea value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} data-testid="input-trial-stage-prompt" /></div>{draft.choices.map((choice, index) => <div className="field" key={index}><label>Choice {String.fromCharCode(65 + index)}{draft.choices.length > 2 && <button type="button" className="small-button danger" style={{ marginLeft: 8 }} onClick={() => removeChoice(index)} aria-label="Remove choice"><Trash2 size={12} /></button>}</label><input value={choice} onChange={(event) => updateChoice(index, event.target.value)} data-testid={`input-trial-stage-choice-${index}`} /></div>)}{draft.choices.length < 4 && <div className="field"><label>&nbsp;</label><button type="button" className="button button-quiet" onClick={addChoice} data-testid="button-trial-stage-add-choice"><Plus size={14} /> Add choice</button></div>}<div className="field"><label>Correct choice</label><select value={draft.correctIndex} onChange={(event) => setDraft({ ...draft, correctIndex: Number(event.target.value) })} data-testid="select-trial-stage-correct">{draft.choices.map((_, index) => <option key={index} value={index}>Choice {String.fromCharCode(65 + index)}</option>)}</select></div></div><div className="form-actions"><button className="button button-quiet" onClick={onClose} data-testid="button-cancel-trial-stage">Cancel</button><button className="button button-primary" onClick={() => onSave(draft)} disabled={!draft.prompt.trim() || draft.choices.some((choice) => !choice.trim())} data-testid="button-save-trial-stage"><Save size={15} /> Save stage</button></div></Modal>;
}

function Router() {
  return <ErrorBoundary resetKey={window.location.pathname}><Shell><Switch><Route path="/" component={Home} /><Route path="/game" component={Game} /><Route path="/tug-of-war" component={TugOfWar} /><Route path="/vault" component={Vault} /><Route path="/diya" component={Diya} /><Route path="/leaderboard" component={Leaderboard} /><Route path="/admin" component={Admin} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}
const queryClient = new QueryClient();
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;