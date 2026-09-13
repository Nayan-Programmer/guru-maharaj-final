import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Expand, Home, RotateCcw, Sparkles, Trophy, Users, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'wouter';
import { defaultTugOfWarSettings, initialQuestionBank, type QuizQuestion, type TugOfWarSettings } from '@/lib/quiz-data';

type PlayerSide = 'left' | 'right';
type Phase = 'setup' | 'countdown' | 'active' | 'victory';
type CountdownValue = 3 | 2 | 1 | 'GO!';
type Feedback = { kind: 'correct' | 'wrong' | 'timeout'; side: PlayerSide; answer?: number; correctAnswer?: number };
type Player = { name: string; className: string; house: string };

const initialPlayers: [Player, Player] = [
  { name: '', className: 'CLASS 3', house: '' },
  { name: '', className: 'CLASS 3', house: '' },
];

const TUG_BACKGROUND_MUSIC = '/guru-assets/quiz-tug-of-war-bg.m4a';
const CORRECT_ANSWER_SOUND = '/guru-assets/correct-answer.mp3';
const WRONG_ANSWER_SOUND = '/guru-assets/wrong-answer.mp3';

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function playTugTone(enabled: boolean, tone: 'countdown' | 'correct' | 'wrong' | 'pull' | 'finish') {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone === 'wrong' ? 'sine' : 'triangle';
    oscillator.frequency.value = tone === 'countdown' ? 500 : tone === 'correct' ? 680 : tone === 'pull' ? 300 : tone === 'finish' ? 440 : 170;
    gain.gain.setValueAtTime(.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + (tone === 'finish' ? .8 : .2));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (tone === 'finish' ? .8 : .22));
  } catch {
    // Sound is an optional enhancement and the game remains fully playable without it.
  }
}

function playAnswerSound(enabled: boolean, correct: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  const sound = new Audio(correct ? CORRECT_ANSWER_SOUND : WRONG_ANSWER_SOUND);
  sound.volume = 0.85;
  void sound.play().catch(() => {
    // The answer result is still shown if the browser blocks audio playback.
  });
}

function numericMathValue(value: string) {
  const normalized = value.trim().replace(/[°,\s]/g, '');
  if (!normalized) return null;

  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : numerator / denominator;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function mathAnswersMatch(input: string, expected: string) {
  const inputValue = numericMathValue(input);
  const expectedValue = numericMathValue(expected);
  return inputValue !== null && expectedValue !== null && Math.abs(inputValue - expectedValue) < 0.0001;
}

function eligibleQuestions(allQuestions: QuizQuestion[], settings: TugOfWarSettings) {
  return allQuestions.filter((question) => (
    question.category === 'Tug of War'
    && question.options.length === 4
    && question.options.every((option) => option.trim())
    && (settings.classSelection === 'ALL' || question.classAssignment === settings.classSelection)
    && (settings.difficulty === 'ALL' || question.difficulty === settings.difficulty)
  ));
}

function chooseQuestions(allQuestions: QuizQuestion[], settings: TugOfWarSettings) {
  const pool = eligibleQuestions(allQuestions, settings);
  const safePool = pool.length ? pool : initialQuestionBank.filter((question) => question.category === 'Tug of War');
  const ordered = settings.randomQuestions ? [...safePool].sort(() => Math.random() - .5) : safePool;
  return ordered.slice(0, Math.min(Math.max(2, settings.questionCount), ordered.length));
}

function winnerFor(position: number, scores: Record<PlayerSide, number>): PlayerSide | 'draw' {
  if (position <= -5) return 'left';
  if (position >= 5) return 'right';
  if (position < 0) return 'left';
  if (position > 0) return 'right';
  if (scores.left > scores.right) return 'left';
  if (scores.right > scores.left) return 'right';
  return 'draw';
}

function PlayerPanel({
  side,
  player,
  question,
  score,
  timer,
  active,
  answered,
  feedback,
  onAnswer,
}: {
  side: PlayerSide;
  player: Player;
  question?: QuizQuestion;
  score: number;
  timer: number;
  active: boolean;
  answered: boolean;
  feedback: Feedback | null;
  onAnswer: (answer: number) => void;
}) {
  const isUrgent = active && timer <= 5;
  const isMathematics = question?.subject.trim().toLowerCase() === 'mathematics';
  const [calculatorInput, setCalculatorInput] = useState('');

  useEffect(() => {
    setCalculatorInput('');
  }, [question?.id]);

  const pressCalculatorKey = (key: string) => {
    if (!active || answered) return;
    if (key === 'C') {
      setCalculatorInput('');
    } else if (key === '⌫') {
      setCalculatorInput((value) => value.slice(0, -1));
    } else {
      setCalculatorInput((value) => `${value}${key}`);
    }
  };

  const submitCalculator = () => {
    if (!question || !calculatorInput.trim() || !active || answered) return;
    const answerIndex = question.options.findIndex((option) => mathAnswersMatch(calculatorInput, option));
    onAnswer(answerIndex);
  };

  return (
    <section className={`tug-player-panel ${side} ${active ? 'is-active' : 'is-waiting'} ${feedback?.side === side ? `feedback-${feedback.kind}` : ''}`}>
      <div className="tug-player-head">
        <div className="tug-avatar" aria-hidden="true">👤</div>
        <div className="tug-player-identity">
          <span className="tug-player-kicker">{side === 'left' ? 'STUDENT 1' : 'STUDENT 2'}</span>
          <strong>{player.name || (side === 'left' ? 'Student 1' : 'Student 2')}</strong>
          <small>{player.className}{player.house ? ` · ${player.house}` : ''}</small>
        </div>
        <div className="tug-score"><span>SCORE</span><strong>{score}</strong></div>
      </div>
      <div className="tug-timer" aria-label={active ? `${timer} seconds remaining` : 'Waiting for turn'}>
        <Clock3 size={19} />
        <strong className={isUrgent ? 'urgent' : ''}>{active ? String(Math.max(0, timer)).padStart(2, '0') : '—'}</strong>
      </div>
      <div className="tug-question-card">
        <div className="tug-question-label">{active ? `QUESTION FOR ${side === 'left' ? 'STUDENT 1' : 'STUDENT 2'}` : 'NEXT UP'}</div>
        {question ? <h2>{question.question}</h2> : <p className="tug-waiting-copy">The next question is getting ready.</p>}
        {isMathematics ? (
          <div className="tug-calculator" aria-label="Mathematics answer calculator">
            <div className={`tug-calculator-output ${answered && feedback?.side === side ? `is-${feedback.kind}` : ''}`} aria-live="polite">
              <span>{calculatorInput || '0'}</span>
            </div>
            <div className="tug-calculator-grid">
              {['7', '8', '9', '⌫', '4', '5', '6', '÷', '1', '2', '3', 'C', '0', '.', '/', '✓'].map((key) => {
                const value = key === '÷' ? '/' : key;
                const isSubmit = key === '✓';
                return (
                  <button
                    key={key}
                    type="button"
                    className={`tug-calculator-key ${isSubmit ? 'submit' : ''} ${key === 'C' ? 'clear' : ''} ${key === '⌫' ? 'backspace' : ''}`}
                    disabled={!active || answered || (isSubmit && !calculatorInput.trim())}
                    onClick={() => isSubmit ? submitCalculator() : pressCalculatorKey(value)}
                    aria-label={key === '⌫' ? 'Backspace' : key === 'C' ? 'Clear answer' : key === '✓' ? 'Submit answer' : key === '÷' ? 'Divide' : key}
                    data-testid={`button-tug-calculator-${side}-${key}`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="tug-answer-grid">
            {question?.options.map((option, index) => {
              const isCorrect = answered && index === question.correctAnswer;
              const isWrong = answered && feedback?.side === side && feedback.answer === index && feedback.kind === 'wrong';
              return (
                <button
                  key={`${question.id}-${index}`}
                  className={`tug-answer ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`}
                  disabled={!active || answered}
                  onClick={() => onAnswer(index)}
                  data-testid={`button-tug-answer-${side}-${index}`}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option}</strong>
                  {isCorrect && <Check size={20} />}
                </button>
              );
            })}
          </div>
        )}
        {feedback?.side === side && (
          <div className={`tug-feedback-message ${feedback.kind}`} role="status">
            {feedback.kind === 'correct' ? 'CORRECT! +1 PULL' : feedback.kind === 'timeout' ? 'TIME UP · NEXT QUESTION' : 'WRONG ANSWER'}
          </div>
        )}
      </div>
    </section>
  );
}

function Confetti() {
  return <div className="tug-confetti" aria-hidden="true">{Array.from({ length: 26 }).map((_, index) => <i key={index} style={{ '--i': index } as React.CSSProperties} />)}</div>;
}

function TugSetup({
  players,
  setPlayers,
  settings,
  availableQuestions,
  sound,
  onSoundChange,
  onStart,
}: {
  players: [Player, Player];
  setPlayers: (players: [Player, Player]) => void;
  settings: TugOfWarSettings;
  availableQuestions: number;
  sound: boolean;
  onSoundChange: () => void;
  onStart: () => void;
}) {
  const updatePlayer = (index: number, update: Partial<Player>) => {
    const next = [...players] as [Player, Player];
    next[index] = { ...next[index], ...update };
    setPlayers(next);
  };
  const namesReady = players.every((player) => player.name.trim());
  return (
    <main className="tug-page tug-setup-page">
      <div className="tug-page-actions">
        <Link href="/game" className="tug-back-link"><ArrowLeft size={16} /> Back to games</Link>
        <div className="tug-action-group">
          <button className="tug-icon-action" onClick={onSoundChange} aria-label={sound ? 'Mute sound' : 'Enable sound'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button className="tug-icon-action" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Enter fullscreen"><Expand size={18} /></button>
        </div>
      </div>
      <div className="tug-setup-hero">
        <div>
          <div className="tug-kicker"><Users size={15} /> A live audience game</div>
          <h1 className="display">Quiz <em>Tug of War</em></h1>
          <p>Two students. One rope. Every correct answer pulls the marker closer to victory.</p>
        </div>
        <div className="tug-setup-rope-preview"><span>←</span><i /><b>🪢</b><i /><span>→</span></div>
      </div>
      <section className="tug-setup-card">
        <div className="tug-setup-title"><div><div className="eyebrow">MATCH SETUP</div><h2>Meet the competitors</h2></div><span className="tug-availability">{availableQuestions} questions ready</span></div>
        <div className="tug-player-setup-grid">
          {[0, 1].map((index) => {
            const player = players[index];
            return <div className={`tug-player-form ${index === 0 ? 'left' : 'right'}`} key={index}>
              <div className="tug-form-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="tug-form-heading"><span>{index === 0 ? 'STUDENT 1' : 'STUDENT 2'}</span><strong>{index === 0 ? 'Pull with purpose.' : 'Hold your ground.'}</strong></div>
              <label>Student name<input value={player.name} onChange={(event) => updatePlayer(index, { name: event.target.value })} placeholder={`Enter Student ${index + 1} name`} autoComplete="off" data-testid={`input-tug-student-${index + 1}-name`} /></label>
              <label>Class<select value={player.className} onChange={(event) => updatePlayer(index, { className: event.target.value })} data-testid={`select-tug-student-${index + 1}-class`}>{['CLASS 3', 'CLASS 4', 'CLASS 5', 'CLASS 6', 'CLASS 7'].map((name) => <option key={name}>{name}</option>)}</select></label>
              <label>Team / house <span className="optional">optional</span><input value={player.house} onChange={(event) => updatePlayer(index, { house: event.target.value })} placeholder="e.g. Surya House" autoComplete="off" data-testid={`input-tug-student-${index + 1}-house`} /></label>
            </div>;
          })}
        </div>
        <div className="tug-ready-row">
          <div><div className="eyebrow">THE RULE</div><p>Answer correctly to pull the rope one position. Reach the opponent's side to win.</p></div>
          <button className="button button-gold tug-start-button" disabled={!namesReady || availableQuestions < 2 || !settings.enabled} onClick={onStart} data-testid="button-tug-start">START GAME <ArrowRight size={18} /></button>
        </div>
        {!settings.enabled && <div className="tug-admin-disabled">Quiz Tug of War is disabled in Admin controls.</div>}
        {settings.enabled && availableQuestions < 2 && <div className="tug-admin-disabled">At least two eligible Tug of War questions are needed. Ask an administrator to add more.</div>}
      </section>
      <div className="tug-setup-footer"><span>READY FOR THE ULTIMATE QUIZ TUG OF WAR?</span><span>{settings.questionCount} questions · {settings.timerDuration} seconds each · {settings.randomQuestions ? 'random order' : 'prepared order'}</span></div>
    </main>
  );
}

export function TugOfWar() {
  const [allQuestions] = useState<QuizQuestion[]>(() => readStored('guru-questions-v4', initialQuestionBank));
  const [settings] = useState<TugOfWarSettings>(() => readStored('tug-of-war-settings', defaultTugOfWarSettings));
  const [sound, setSound] = useState(() => readStored('guru-sound-enabled', true));
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const [players, setPlayers] = useState<[Player, Player]>(initialPlayers);
  const [phase, setPhase] = useState<Phase>('setup');
  const [countdown, setCountdown] = useState<CountdownValue>(3);
  const [matchQuestions, setMatchQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timer, setTimer] = useState(settings.timerDuration);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [ropePosition, setRopePosition] = useState(0);
  const [scores, setScores] = useState<Record<PlayerSide, number>>({ left: 0, right: 0 });
  const [winner, setWinner] = useState<PlayerSide | 'draw'>('draw');
  const currentQuestion = matchQuestions[currentIndex];
  const currentSide: PlayerSide = currentIndex % 2 === 0 ? 'left' : 'right';
  const availableQuestions = eligibleQuestions(allQuestions, settings).length;

  useEffect(() => {
    const music = new Audio(TUG_BACKGROUND_MUSIC);
    music.loop = true;
    music.preload = 'auto';
    music.volume = 0.22;
    backgroundMusicRef.current = music;

    return () => {
      music.pause();
      music.currentTime = 0;
      backgroundMusicRef.current = null;
    };
  }, []);

  useEffect(() => {
    const music = backgroundMusicRef.current;
    if (!music) return;

    if (!sound || phase === 'setup') {
      music.pause();
      if (phase === 'setup') music.currentTime = 0;
      return;
    }

    void music.play().catch(() => {
      // Browsers can still reject playback if the gesture has expired.
      // The sound button remains available to start it again.
    });
  }, [phase, sound]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const delay = countdown === 'GO!' ? 550 : 700;
    const timeout = window.setTimeout(() => {
      if (countdown === 'GO!') {
        setPhase('active');
        setTimer(settings.timerDuration);
        return;
      }
      setCountdown(countdown === 3 ? 2 : countdown === 2 ? 1 : 'GO!');
      playTugTone(sound, 'countdown');
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [countdown, phase, settings.timerDuration, sound]);

  useEffect(() => {
    if (phase !== 'active' || answered || !currentQuestion) return;
    const interval = window.setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [answered, currentIndex, currentQuestion, phase]);

  useEffect(() => {
    if (phase === 'active' && !answered && timer === 0) resolveAnswer(null);
    // resolveAnswer is intentionally kept stable for the current question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, phase, answered]);

  const startGame = () => {
    const selectedQuestions = chooseQuestions(allQuestions, settings);
    setMatchQuestions(selectedQuestions);
    setCurrentIndex(0);
    setRopePosition(0);
    setScores({ left: 0, right: 0 });
    setAnswered(false);
    setFeedback(null);
    setWinner('draw');
    setCountdown(3);
    setPhase('countdown');
    if (sound) void backgroundMusicRef.current?.play().catch(() => {});
    playTugTone(sound, 'countdown');
  };

  const toggleSound = () => {
    const nextSound = !sound;
    setSound(nextSound);
    window.localStorage.setItem('guru-sound-enabled', JSON.stringify(nextSound));
    if (nextSound && phase !== 'setup') void backgroundMusicRef.current?.play().catch(() => {});
  };

  function resolveAnswer(answer: number | null) {
    if (answered || !currentQuestion || phase !== 'active') return;
    const correct = answer === currentQuestion.correctAnswer;
    const nextPosition = correct ? Math.max(-5, Math.min(5, ropePosition + (currentSide === 'left' ? -1 : 1))) : ropePosition;
    const nextScores = correct ? { ...scores, [currentSide]: scores[currentSide] + 1 } : scores;
    setAnswered(true);
    setFeedback({ kind: answer === null ? 'timeout' : correct ? 'correct' : 'wrong', side: currentSide, answer: answer ?? undefined, correctAnswer: currentQuestion.correctAnswer });
    setRopePosition(nextPosition);
    playAnswerSound(sound, correct);
    window.setTimeout(() => {
      const isLastQuestion = currentIndex >= matchQuestions.length - 1;
      if (isLastQuestion || Math.abs(nextPosition) >= 5) {
        setScores(nextScores);
        setWinner(winnerFor(nextPosition, nextScores));
        setPhase('victory');
        playTugTone(sound, 'finish');
      } else {
        setScores(nextScores);
        setCurrentIndex((value) => value + 1);
        setTimer(settings.timerDuration);
        setAnswered(false);
        setFeedback(null);
      }
    }, 1200);
  }

  const playAgain = () => {
    setPhase('setup');
    setMatchQuestions([]);
    setCurrentIndex(0);
    setRopePosition(0);
    setScores({ left: 0, right: 0 });
    setAnswered(false);
    setFeedback(null);
    setTimer(settings.timerDuration);
  };

  if (phase === 'setup') {
    return <TugSetup players={players} setPlayers={setPlayers} settings={settings} availableQuestions={availableQuestions} sound={sound} onSoundChange={toggleSound} onStart={startGame} />;
  }

  if (phase === 'countdown') {
    return <main className="tug-page tug-countdown-page"><div className="tug-countdown-label">GET READY</div><div className="tug-countdown-number">{countdown}</div><div className="tug-countdown-names"><span>{players[0].name}</span><b>VS</b><span>{players[1].name}</span></div></main>;
  }

  if (phase === 'victory') {
    const winnerName = winner === 'left' ? players[0].name : winner === 'right' ? players[1].name : '';
    return <main className="tug-page tug-victory-page"><Confetti /><div className="tug-victory-mark"><Trophy size={40} /></div><div className="tug-kicker"><Sparkles size={15} /> MATCH COMPLETE</div><h1 className="display">{winner === 'draw' ? "It's a draw!" : `${winnerName} wins!`}</h1><p className="tug-victory-line">{winner === 'draw' ? 'Perfectly balanced. What a match!' : 'What a pull!'}</p><div className="tug-final-score"><div><span>{players[0].name}</span><strong>{scores.left}</strong><small>{players[0].className}</small></div><b>—</b><div><span>{players[1].name}</span><strong>{scores.right}</strong><small>{players[1].className}</small></div></div><div className="tug-victory-actions"><button className="button button-gold" onClick={playAgain} data-testid="button-tug-play-again"><RotateCcw size={17} /> PLAY AGAIN</button><Link href="/game" className="button button-quiet" data-testid="button-tug-back-games"><Home size={17} /> BACK TO GAMES</Link></div></main>;
  }

  return (
    <main className="tug-page tug-game-page">
      <div className="tug-game-toolbar"><div><span className="tug-kicker"><Users size={15} /> QUIZ TUG OF WAR</span><strong>Round {currentIndex + 1} of {matchQuestions.length}</strong></div><div className="tug-game-toolbar-actions"><span className="tug-turn-label">{currentSide === 'left' ? players[0].name : players[1].name}'s turn</span><button className="tug-icon-action" onClick={toggleSound} aria-label={sound ? 'Mute sound' : 'Enable sound'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="tug-icon-action" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Enter fullscreen"><Expand size={18} /></button></div></div>
      <div className="tug-arena">
        <PlayerPanel side="left" player={players[0]} question={currentSide === 'left' ? currentQuestion : undefined} score={scores.left} timer={timer} active={currentSide === 'left'} answered={answered} feedback={feedback} onAnswer={(answer) => resolveAnswer(answer)} />
        <div className="tug-center-column">
          <div className="tug-board-scorebar">
            <div className="tug-board-team left"><span className="tug-board-team-icon">♛</span><span><small>OWNER</small><strong>{players[0].name || 'Student 1'}</strong></span><b>{scores.left}</b></div>
            <div className="tug-board-status"><span>●</span>{feedback?.kind === 'timeout' ? 'Time is up' : feedback ? 'Answer locked' : `${currentSide === 'left' ? players[0].name || 'Student 1' : players[1].name || 'Student 2'} is answering`} <small>{timer}s</small></div>
            <div className="tug-board-team right"><b>{scores.right}</b><span><small>PLAYER</small><strong>{players[1].name || 'Student 2'}</strong></span><span className="tug-board-team-icon">●</span></div>
          </div>
          <div className={`tug-board-frame ${feedback?.kind === 'correct' ? 'is-pulling' : ''}`}>
            <img src="/guru-assets/tug-of-war-arena.png" alt="Two teams pulling a tug-of-war rope" className="tug-board-art" />
            <span className="tug-live-marker" style={{ left: `calc(50% + ${ropePosition * 7}%)` }} aria-hidden="true" />
          </div>
          <div className="tug-position-label">{ropePosition === 0 ? 'CENTER' : ropePosition < 0 ? `${Math.abs(ropePosition)} PULL LEFT` : `${ropePosition} PULL RIGHT`}</div>
          <div className="tug-position-dots">{Array.from({ length: 11 }).map((_, index) => <i className={index - 5 === ropePosition ? 'active' : ''} key={index} />)}</div>
          {feedback && <div className={`tug-center-feedback ${feedback.kind}`}>{feedback.kind === 'correct' ? 'CORRECT! +1 PULL' : feedback.kind === 'timeout' ? 'TIME UP' : 'WRONG ANSWER'}</div>}
          <div className="tug-next-hint"><ArrowLeft size={14} /> {players[0].name}<span />{players[1].name} <ArrowRight size={14} /></div>
        </div>
        <PlayerPanel side="right" player={players[1]} question={currentSide === 'right' ? currentQuestion : undefined} score={scores.right} timer={timer} active={currentSide === 'right'} answered={answered} feedback={feedback} onAnswer={(answer) => resolveAnswer(answer)} />
      </div>
      <div className="tug-game-footer"><span>Correct answer = one pull toward your side</span><span>Position {ropePosition + 5} / 10</span></div>
    </main>
  );
}