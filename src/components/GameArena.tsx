import React, { useState, useEffect, useRef } from 'react';
import { playGameTone } from '../lib/sound.ts';
import { RotateCcw, Trophy, Clock, CheckCircle2, HelpCircle, ArrowLeft } from 'lucide-react';

export interface GameArenaProps {
  gameSlug: string;
  lang: 'en' | 'ur';
  isAuthenticated: boolean;
  onSaveScore: (gameSlug: string, score: number, durationSeconds: number) => Promise<{
    earnedXp?: number;
    newlyUnlocked?: string[];
    error?: string;
  }>;
  onBack: () => void;
}

type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

// Quiz Question Bank (Pakistan & General Knowledge)
const QUIZ_QUESTIONS = [
  {
    q: 'Which mountain peak in Pakistan is the second-highest on Earth at 8,611 meters?',
    qUr: 'پاکستان میں دنیا کی دوسری بلند ترین چوٹی کون سی ہے جس کی بلندی 8,611 میٹر ہے؟',
    options: ['K2 (Godwin-Austen)', 'Nanga Parbat', 'Gasherbrum I', 'Broad Peak'],
    answer: 0,
    explanation: 'K2, located in the Karakoram range in Gilgit-Baltistan, stands at 8,611 meters (28,251 ft).',
  },
  {
    q: 'In which year did Pakistan win the ICC Men’s Cricket World Cup under Imran Khan’s captaincy?',
    qUr: 'پاکستان نے عمران خان کی قیادت میں آئی سی سی کرکٹ ورلڈ کپ کس سال جیتا؟',
    options: ['1987', '1992', '1996', '1999'],
    answer: 1,
    explanation: 'Pakistan won the 1992 Cricket World Cup final in Melbourne against England by 22 runs.',
  },
  {
    q: 'Which ancient Indus Valley Civilization city is located in Larkana District, Sindh?',
    qUr: 'وادئ سندھ کی تہذیب کا کون سا قدیم شہر ضلع لاڑکانہ، سندھ میں واقع ہے؟',
    options: ['Taxila', 'Harappa', 'Mohenjo-daro', 'Mehrgarh'],
    answer: 2,
    explanation: 'Mohenjo-daro, built around 2500 BCE, is a UNESCO World Heritage site in Larkana District, Sindh.',
  },
  {
    q: 'Which Pakistani physicist won the Nobel Prize in Physics in 1979 for the electroweak unification theory?',
    qUr: 'کس پاکستانی سائنسدان نے 1979 میں فزکس کا نوبل انعام حاصل کیا؟',
    options: ['Dr. Abdul Qadeer Khan', 'Dr. Abdus Salam', 'Dr. Samar Mubarakmand', 'Dr. Atta-ur-Rahman'],
    answer: 1,
    explanation: 'Dr. Abdus Salam shared the 1979 Nobel Prize in Physics for his contribution to electroweak unification.',
  },
  {
    q: 'What is the national flower of Pakistan?',
    qUr: 'پاکستان کا قومی پھول کون سا ہے؟',
    options: ['Rose', 'Jasmine (Chambeli)', 'Lotus', 'Sunflower'],
    answer: 1,
    explanation: 'Common Jasmine (Jasminum officinale), known locally as Chambeli, was adopted as Pakistan’s national flower in 1961.',
  },
  {
    q: 'Which pass connects Chitral with Gilgit-Baltistan and hosts the world’s highest polo ground?',
    qUr: 'کون سا درہ چترال کو گلگت بلتستان سے ملاتا ہے جہاں دنیا کا بلند ترین پولو گراؤنڈ ہے؟',
    options: ['Khyber Pass', 'Khunjerab Pass', 'Shandur Pass', 'Babusar Pass'],
    answer: 2,
    explanation: 'Shandur Pass sits at 3,700 meters and hosts the annual Shandur Polo Festival.',
  },
  {
    q: 'In computer science, what is the time complexity of binary search on a sorted array of N items?',
    qUr: 'کمپیوٹر سائنس میں ترتیب شدہ ایرے پر بائنری سرچ کی ٹائم کمپلیکسٹی کیا ہے؟',
    options: ['O(N)', 'O(log N)', 'O(N log N)', 'O(1)'],
    answer: 1,
    explanation: 'Binary search halves the search interval each step, resulting in logarithmic O(log N) time complexity.',
  },
  {
    q: 'Which river is the longest river flowing through Pakistan?',
    qUr: 'پاکستان میں بہنے والا سب سے طویل دریا کون سا ہے؟',
    options: ['River Chenab', 'River Jhelum', 'River Indus (Sindhu)', 'River Ravi'],
    answer: 2,
    explanation: 'The Indus River flows for approximately 3,180 km through Tibet, Gilgit-Baltistan, KPK, Punjab, and Sindh into the Arabian Sea.',
  },
];

export const GameArena: React.FC<GameArenaProps> = ({
  gameSlug,
  lang,
  isAuthenticated,
  onSaveScore,
  onBack,
}) => {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [personalBest, setPersonalBest] = useState<number>(() => {
    const saved = localStorage.getItem(`gzpk_best_${gameSlug}`);
    return saved ? Number(saved) : 0;
  });
  const [submissionStatus, setSubmissionStatus] = useState<{
    saving: boolean;
    saved: boolean;
    xp?: number;
    badges?: string[];
    error?: string;
  }>({ saving: false, saved: false });

  const startTimeRef = useRef<number>(0);

  // Memory Match State
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [cards, setCards] = useState<{ id: number; symbol: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  // Quick Tap State
  const [activeNode, setActiveNode] = useState<number>(4);
  const [timeLeft, setTimeLeft] = useState<number>(25);
  const [hits, setHits] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Brain Quiz State
  const [quizQuestions, setQuizQuestions] = useState<typeof QUIZ_QUESTIONS>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);

  // Number Puzzle State (4x4 = 16 tiles, 0 is empty)
  const [puzzleTiles, setPuzzleTiles] = useState<number[]>([]);
  const [puzzleMoves, setPuzzleMoves] = useState(0);

  // Tic-Tac-Toe State
  const [tttBoard, setTttBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [tttRound, setTttRound] = useState(1);
  const [tttPlayerWins, setTttPlayerWins] = useState(0);
  const [tttBotWins, setTttBotWins] = useState(0);
  const [tttTurn, setTttTurn] = useState<'X' | 'O'>('X');

  // Daily Challenge State
  const [dailyPuzzles, setDailyPuzzles] = useState<
    { prompt: string; answer: number; options: number[]; explanation: string }[]
  >([]);
  const [dailyStep, setDailyStep] = useState(0);
  const [dailyCorrect, setDailyCorrect] = useState(0);

  // Elapsed timer during gameplay
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setDurationSeconds(Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000)));
    }, 500);
    return () => clearInterval(interval);
  }, [gameState]);

  // Quick Tap countdown timer
  useEffect(() => {
    if (gameState !== 'PLAYING' || gameSlug !== 'quick-tap') return;
    if (timeLeft <= 0) {
      const finalScore = Math.max(0, hits * 25 - misses * 10);
      finishGame(finalScore);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, gameSlug, timeLeft, hits, misses]);

  const finishGame = async (finalScore: number) => {
    const elapsed = Math.max(3, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setScore(finalScore);
    setDurationSeconds(elapsed);
    setGameState('GAME_OVER');
    playGameTone('victory');

    if (finalScore > personalBest) {
      setPersonalBest(finalScore);
      localStorage.setItem(`gzpk_best_${gameSlug}`, String(finalScore));
    }

    if (isAuthenticated && finalScore > 0) {
      setSubmissionStatus({ saving: true, saved: false });
      const res = await onSaveScore(gameSlug, finalScore, elapsed);
      if (res.error) {
        setSubmissionStatus({ saving: false, saved: false, error: res.error });
      } else {
        setSubmissionStatus({
          saving: false,
          saved: true,
          xp: res.earnedXp,
          badges: res.newlyUnlocked,
        });
      }
    } else {
      setSubmissionStatus({ saving: false, saved: false });
    }
  };

  const startGame = () => {
    startTimeRef.current = Date.now();
    setScore(0);
    setDurationSeconds(0);
    setSubmissionStatus({ saving: false, saved: false });
    setGameState('PLAYING');

    if (gameSlug === 'memory-match') {
      const allSymbols = ['◈', '❖', '✦', '❂', '⚜', '✧', '✪', '⌬', '⏣', '⬡'];
      const pairCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
      const chosen = allSymbols.slice(0, pairCount);
      const deck = [...chosen, ...chosen]
        .sort(() => Math.random() - 0.5)
        .map((symbol, idx) => ({ id: idx, symbol, flipped: false, matched: false }));
      setCards(deck);
      setFlippedIndices([]);
      setMoves(0);
    } else if (gameSlug === 'quick-tap') {
      setHits(0);
      setMisses(0);
      setTimeLeft(25);
      setActiveNode(Math.floor(Math.random() * 16));
    } else if (gameSlug === 'brain-quiz') {
      const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 6);
      setQuizQuestions(shuffled);
      setCurrentQIndex(0);
      setSelectedOption(null);
      setQuizCorrectCount(0);
    } else if (gameSlug === 'number-puzzle') {
      // Generate solvable 4x4 board by making 45 random valid slides from solved state
      const solved = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
      let current = [...solved];
      let emptyIdx = 15;
      for (let i = 0; i < 45; i++) {
        const neighbors: number[] = [];
        const r = Math.floor(emptyIdx / 4);
        const c = emptyIdx % 4;
        if (r > 0) neighbors.push(emptyIdx - 4);
        if (r < 3) neighbors.push(emptyIdx + 4);
        if (c > 0) neighbors.push(emptyIdx - 1);
        if (c < 3) neighbors.push(emptyIdx + 1);
        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        current[emptyIdx] = current[pick];
        current[pick] = 0;
        emptyIdx = pick;
      }
      setPuzzleTiles(current);
      setPuzzleMoves(0);
    } else if (gameSlug === 'tic-tac-toe') {
      setTttBoard(Array(9).fill(null));
      setTttRound(1);
      setTttPlayerWins(0);
      setTttBotWins(0);
      setTttTurn('X');
    } else if (gameSlug === 'daily-challenge') {
      const todaySeed = new Date().getDate();
      const p1Ans = (todaySeed + 7) * 3;
      const p2Ans = todaySeed * 4 + 12;
      const p3Ans = 144 - todaySeed * 2;
      setDailyPuzzles([
        {
          prompt: `Sequence I: (${todaySeed} + 7) × 3 = ?`,
          answer: p1Ans,
          options: [p1Ans, p1Ans + 3, p1Ans - 6, p1Ans + 9].sort((a, b) => a - b),
          explanation: `Adding 7 to ${todaySeed} and multiplying by 3 yields ${p1Ans}.`,
        },
        {
          prompt: `Sequence II: (${todaySeed} × 4) + 12 = ?`,
          answer: p2Ans,
          options: [p2Ans - 4, p2Ans, p2Ans + 4, p2Ans + 8].sort((a, b) => a - b),
          explanation: `Multiplying ${todaySeed} by 4 and adding 12 equals ${p2Ans}.`,
        },
        {
          prompt: `Sequence III: 144 − (${todaySeed} × 2) = ?`,
          answer: p3Ans,
          options: [p3Ans - 2, p3Ans, p3Ans + 2, p3Ans + 6].sort((a, b) => a - b),
          explanation: `Subtracting (${todaySeed} × 2) from 144 equals ${p3Ans}.`,
        },
      ]);
      setDailyStep(0);
      setDailyCorrect(0);
    }
  };

  // Memory Match Card Handler
  const handleCardFlip = (index: number) => {
    if (flippedIndices.length >= 2 || cards[index].flipped || cards[index].matched) return;
    playGameTone('flip');
    const updated = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    setCards(updated);
    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [firstIdx, secondIdx] = nextFlipped;
      if (updated[firstIdx].symbol === updated[secondIdx].symbol) {
        playGameTone('match');
        const matchedCards = updated.map((c, i) =>
          i === firstIdx || i === secondIdx ? { ...c, matched: true } : c
        );
        setCards(matchedCards);
        setFlippedIndices([]);
        if (matchedCards.every((c) => c.matched)) {
          const basePoints = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 750 : 1000;
          const calculated = Math.max(150, basePoints - nextMoves * 12);
          setTimeout(() => finishGame(calculated), 350);
        }
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) => (i === firstIdx || i === secondIdx ? { ...c, flipped: false } : c))
          );
          setFlippedIndices([]);
        }, 650);
      }
    }
  };

  // Quick Tap Handler
  const handleTapCell = (idx: number) => {
    const now = Date.now();
    // Anti-automation guard: ignore robotic <35ms clicks
    if (now - lastTapTimeRef.current < 35) return;
    lastTapTimeRef.current = now;

    if (idx === activeNode) {
      playGameTone('hit');
      setHits((h) => h + 1);
      let nextNode = Math.floor(Math.random() * 16);
      if (nextNode === activeNode) nextNode = (nextNode + 1) % 16;
      setActiveNode(nextNode);
    } else {
      playGameTone('miss');
      setMisses((m) => m + 1);
    }
  };

  // Brain Quiz Answer Handler
  const handleQuizSelect = (optionIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);
    const currentQ = quizQuestions[currentQIndex];
    const isCorrect = optionIdx === currentQ.answer;
    if (isCorrect) {
      playGameTone('match');
      setQuizCorrectCount((c) => c + 1);
    } else {
      playGameTone('miss');
    }
  };

  const handleNextQuizQuestion = () => {
    if (currentQIndex + 1 >= quizQuestions.length) {
      const finalScore = quizCorrectCount * 150;
      finishGame(finalScore);
    } else {
      setSelectedOption(null);
      setCurrentQIndex((i) => i + 1);
    }
  };

  // Number Puzzle Handler
  const handlePuzzleTileClick = (index: number) => {
    const emptyIdx = puzzleTiles.indexOf(0);
    const r1 = Math.floor(index / 4);
    const c1 = index % 4;
    const r2 = Math.floor(emptyIdx / 4);
    const c2 = emptyIdx % 4;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    playGameTone('flip');
    const next = [...puzzleTiles];
    next[emptyIdx] = next[index];
    next[index] = 0;
    const nextMoves = puzzleMoves + 1;
    setPuzzleTiles(next);
    setPuzzleMoves(nextMoves);

    const isSolved = next.slice(0, 15).every((val, idx) => val === idx + 1);
    if (isSolved) {
      const calcScore = Math.max(200, 900 - nextMoves * 5);
      setTimeout(() => finishGame(calcScore), 300);
    }
  };

  // Tic-Tac-Toe Winner Check
  const checkTttWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every((cell) => cell !== null)) return 'DRAW';
    return null;
  };

  const handleTttClick = (idx: number) => {
    if (tttTurn !== 'X' || tttBoard[idx] !== null) return;
    playGameTone('flip');
    const next = [...tttBoard];
    next[idx] = 'X';
    setTttBoard(next);

    const outcome = checkTttWinner(next);
    if (outcome) {
      resolveTttRound(outcome);
      return;
    }

    setTttTurn('O');
    setTimeout(() => {
      // Tactical Bot Move
      const available = next.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
      if (available.length === 0) return;

      // Try winning or blocking move
      let chosenMove = available[Math.floor(Math.random() * available.length)];
      for (const mark of ['O', 'X']) {
        for (const spot of available) {
          const copy = [...next];
          copy[spot] = mark;
          if (checkTttWinner(copy) === mark) {
            chosenMove = spot;
            break;
          }
        }
      }
      if (next[4] === null) chosenMove = 4;

      const afterBot = [...next];
      afterBot[chosenMove] = 'O';
      playGameTone('flip');
      setTttBoard(afterBot);
      const botOutcome = checkTttWinner(afterBot);
      if (botOutcome) {
        resolveTttRound(botOutcome);
      } else {
        setTttTurn('X');
      }
    }, 520);
  };

  const resolveTttRound = (winner: string) => {
    let pWins = tttPlayerWins;
    let bWins = tttBotWins;
    if (winner === 'X') {
      pWins += 1;
      setTttPlayerWins(pWins);
      playGameTone('match');
    } else if (winner === 'O') {
      bWins += 1;
      setTttBotWins(bWins);
      playGameTone('miss');
    }

    if (tttRound >= 3) {
      const finalScore = pWins * 250 + (3 - pWins - bWins) * 80;
      setTimeout(() => finishGame(Math.max(100, finalScore)), 500);
    } else {
      setTimeout(() => {
        setTttRound((r) => r + 1);
        setTttBoard(Array(9).fill(null));
        setTttTurn('X');
      }, 700);
    }
  };

  // Daily Challenge Handler
  const handleDailySelect = (val: number) => {
    const current = dailyPuzzles[dailyStep];
    const isCorrect = val === current.answer;
    const nextCorrect = isCorrect ? dailyCorrect + 1 : dailyCorrect;
    if (isCorrect) {
      playGameTone('match');
      setDailyCorrect(nextCorrect);
    } else {
      playGameTone('miss');
    }

    if (dailyStep + 1 >= dailyPuzzles.length) {
      finishGame(nextCorrect * 250);
    } else {
      setDailyStep((s) => s + 1);
    }
  };

  const gameMeta: Record<string, { title: string; titleUr: string; rules: string; rulesUr: string }> = {
    'memory-match': {
      title: 'Memory Match',
      titleUr: 'میموری میچ',
      rules: 'Flip two geometric cards at a time to locate matching pairs. Fewer moves earn higher verified leaderboard scores.',
      rulesUr: 'دو کارڈز پلٹیں اور ایک جیسے نشانات ملائیں۔ کم چالوں پر زیادہ اسکور ملے گا۔',
    },
    'quick-tap': {
      title: 'Quick Tap Reflex',
      titleUr: 'کوئیک ٹیپ ریفلیکس',
      rules: 'Tap the highlighted emerald target node as fast as possible within 25 seconds. Accurate hits grant +25 points; misses deduct 10 points.',
      rulesUr: '25 سیکنڈ کے اندر روشن ایمرالڈ ہدف کو تیزی سے ٹیپ کریں۔ ہر درست ٹیپ پر 25 پوائنٹس ملتے ہیں۔',
    },
    'brain-quiz': {
      title: 'Pakistan Brain Quiz',
      titleUr: 'پاکستان برین کوئز',
      rules: 'Answer 6 randomized multiple-choice questions on Pakistan’s geography, cricket, science, and history. Each correct answer awards 150 points.',
      rulesUr: 'پاکستان کی تاریخ، جغرافیہ، سائنس اور کرکٹ سے متعلق 6 سوالات کے جواب دیں۔',
    },
    'number-puzzle': {
      title: 'Sliding Number Puzzle',
      titleUr: 'سلائیڈنگ نمبر پزل',
      rules: 'Slide adjacent tiles into the empty slot to arrange numbers 1 through 15 in ascending order.',
      rulesUr: 'نمبروں کو کھسکا کر 1 سے 15 تک ترتیب وار مکمل کریں۔',
    },
    'tic-tac-toe': {
      title: 'Tactical Tic-Tac-Toe (3-Round Series)',
      titleUr: 'ٹیکٹیکل ٹک ٹیک ٹو (3 راؤنڈز)',
      rules: 'Compete against the GameZone AI tactical bot across a 3-round series. Align 3 marks horizontally, vertically, or diagonally.',
      rulesUr: 'تین راؤنڈز کی سیریز میں کمپیوٹر بوٹ کے خلاف تین نشانات ایک قطار میں ملائیں۔',
    },
    'daily-challenge': {
      title: 'Daily Emerald Cipher',
      titleUr: 'ڈیلی ایمرالڈ چیلنج',
      rules: 'Solve today’s three deterministic arithmetic sequences to claim non-cash virtual XP points.',
      rulesUr: 'آج کے تین حسابی سوالات حل کریں اور ورچوئل ایکس پی پوائنٹس حاصل کریں۔',
    },
  };

  const info = gameMeta[gameSlug] || gameMeta['memory-match'];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ur' ? 'گیمز کی فہرست پر واپس' : 'Back to Games Lobby'}</span>
        </button>
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono tabular-nums">
          <span>
            {lang === 'ur' ? 'بہترین اسکور:' : 'Personal Best:'} <strong className="text-amber-400">{personalBest}</strong>
          </span>
          <span>·</span>
          <span>
            {lang === 'ur' ? 'وقت:' : 'Elapsed:'} <strong className="text-slate-200">{durationSeconds}s</strong>
          </span>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 sm:p-8">
        {/* TITLE MENU */}
        {gameState === 'TITLE_MENU' && (
          <div className="text-center max-w-xl mx-auto py-6">
            <p className="text-xs text-emerald-400 font-medium mb-2">
              {lang === 'ur' ? 'مفت اسکل گیم · کوئی ڈپازٹ نہیں' : 'Free-to-Play Skill Game · Zero Deposit Required'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {lang === 'ur' ? info.titleUr : info.title}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {lang === 'ur' ? info.rulesUr : info.rules}
            </p>

            {gameSlug === 'memory-match' && (
              <div className="mb-6">
                <p className="text-xs text-slate-400 mb-2">Select Grid Difficulty</p>
                <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setDifficulty(lvl)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 ${
                        difficulty === lvl
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl} ({lvl === 'easy' ? '12 Cards' : lvl === 'medium' ? '16 Cards' : '20 Cards'})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={startGame}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'ur' ? 'گیم شروع کریں' : 'Start Game'}
            </button>
          </div>
        )}

        {/* ACTIVE GAMEPLAY */}
        {gameState === 'PLAYING' && (
          <div>
            {/* MEMORY MATCH */}
            {gameSlug === 'memory-match' && (
              <div>
                <div className="flex items-center justify-between mb-4 text-xs text-slate-400 font-mono tabular-nums">
                  <span>Moves: {moves}</span>
                  <span>
                    Matched: {cards.filter((c) => c.matched).length / 2} / {cards.length / 2}
                  </span>
                  <button
                    onClick={startGame}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </button>
                </div>
                <div
                  className={`grid gap-3 ${
                    difficulty === 'easy'
                      ? 'grid-cols-3 sm:grid-cols-4'
                      : difficulty === 'medium'
                      ? 'grid-cols-4'
                      : 'grid-cols-4 sm:grid-cols-5'
                  }`}
                >
                  {cards.map((card, idx) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardFlip(idx)}
                      className={`h-20 sm:h-24 rounded-lg border text-2xl font-bold transition-all flex items-center justify-center ${
                        card.matched
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                          : card.flipped
                          ? 'bg-slate-800 border-amber-400/70 text-amber-300'
                          : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-600'
                      }`}
                    >
                      {card.flipped || card.matched ? card.symbol : '◈'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QUICK TAP */}
            {gameSlug === 'quick-tap' && (
              <div>
                <div className="flex items-center justify-between mb-4 text-xs font-mono tabular-nums">
                  <span className="text-emerald-400 font-semibold">Hits: {hits}</span>
                  <span className="text-amber-400 font-semibold">Time Left: {timeLeft}s</span>
                  <span className="text-slate-400">Misses: {misses}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const isTarget = idx === activeNode;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleTapCell(idx)}
                        className={`h-20 rounded-lg border transition-transform active:scale-95 flex items-center justify-center font-mono text-xs ${
                          isTarget
                            ? 'bg-emerald-600 border-amber-300 text-white font-bold shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700'
                        }`}
                      >
                        {isTarget ? 'TAP' : '·'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BRAIN QUIZ */}
            {gameSlug === 'brain-quiz' && quizQuestions.length > 0 && (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4 text-xs text-slate-400 font-mono tabular-nums">
                  <span>
                    Question {currentQIndex + 1} of {quizQuestions.length}
                  </span>
                  <span>Correct: {quizCorrectCount}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-5">
                  {lang === 'ur' ? quizQuestions[currentQIndex].qUr : quizQuestions[currentQIndex].q}
                </h3>
                <div className="space-y-2.5 mb-6">
                  {quizQuestions[currentQIndex].options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isAnswer = idx === quizQuestions[currentQIndex].answer;
                    let btnStyle = 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600';
                    if (selectedOption !== null) {
                      if (isAnswer) {
                        btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                      } else if (isSelected) {
                        btnStyle = 'bg-red-950/60 border-red-500 text-red-200';
                      }
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuizSelect(idx)}
                        disabled={selectedOption !== null}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {selectedOption !== null && isAnswer && (
                          <span className="text-xs font-mono text-emerald-400">Correct</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 mb-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong className="text-amber-400">Explanation:</strong>{' '}
                      {quizQuestions[currentQIndex].explanation}
                    </p>
                  </div>
                )}
                {selectedOption !== null && (
                  <button
                    onClick={handleNextQuizQuestion}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {currentQIndex + 1 >= quizQuestions.length ? 'Finish Quiz' : 'Next Question'}
                  </button>
                )}
              </div>
            )}

            {/* NUMBER PUZZLE */}
            {gameSlug === 'number-puzzle' && (
              <div className="max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-4 text-xs text-slate-400 font-mono tabular-nums">
                  <span>Moves: {puzzleMoves}</span>
                  <button
                    onClick={startGame}
                    className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reshuffle
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {puzzleTiles.map((num, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePuzzleTileClick(idx)}
                      disabled={num === 0}
                      className={`h-16 rounded-lg border font-mono text-lg font-bold transition-colors ${
                        num === 0
                          ? 'bg-slate-950 border-slate-900 cursor-default'
                          : num === idx + 1
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-white hover:border-amber-400/60'
                      }`}
                    >
                      {num !== 0 ? num : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TIC-TAC-TOE */}
            {gameSlug === 'tic-tac-toe' && (
              <div className="max-w-xs mx-auto text-center">
                <div className="flex items-center justify-between mb-4 text-xs font-mono tabular-nums text-slate-300">
                  <span>Round {tttRound}/3</span>
                  <span className="text-emerald-400">You (X): {tttPlayerWins}</span>
                  <span className="text-amber-400">Bot (O): {tttBotWins}</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {tttBoard.map((cell, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTttClick(idx)}
                      className="h-20 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-2xl font-bold font-mono flex items-center justify-center"
                    >
                      <span className={cell === 'X' ? 'text-emerald-400' : 'text-amber-400'}>
                        {cell || ''}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  {tttTurn === 'X' ? 'Your turn — select an open square' : 'GameZone Bot is calculating move...'}
                </p>
              </div>
            )}

            {/* DAILY CHALLENGE */}
            {gameSlug === 'daily-challenge' && dailyPuzzles.length > 0 && (
              <div className="max-w-lg mx-auto text-center">
                <p className="text-xs font-mono text-amber-400 mb-2">
                  Stage {dailyStep + 1} of {dailyPuzzles.length} · Virtual XP Reward
                </p>
                <h3 className="text-xl font-mono font-bold text-white mb-6">
                  {dailyPuzzles[dailyStep].prompt}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {dailyPuzzles[dailyStep].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDailySelect(opt)}
                      className="py-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-white font-mono text-lg font-semibold transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME OVER SUMMARY */}
        {gameState === 'GAME_OVER' && (
          <div className="text-center max-w-lg mx-auto py-6">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white mb-1">
              {lang === 'ur' ? 'راؤنڈ مکمل ہو گیا!' : 'Session Complete'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {lang === 'ur'
                ? 'آپ کا اسکور اور وقت نیچے درج ہے'
                : 'Verified session telemetry recorded below'}
            </p>

            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800 mb-6 font-mono tabular-nums">
              <div>
                <p className="text-xs text-slate-400">Final Score</p>
                <p className="text-xl font-bold text-emerald-400">{score}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Duration</p>
                <p className="text-xl font-bold text-white">{durationSeconds}s</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Personal Best</p>
                <p className="text-xl font-bold text-amber-400">{personalBest}</p>
              </div>
            </div>

            {isAuthenticated ? (
              <div className="mb-6 text-xs">
                {submissionStatus.saving && (
                  <p className="text-slate-300">Validating score with GameZone PK server...</p>
                )}
                {submissionStatus.saved && (
                  <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200">
                    <p className="font-medium">
                      Score verified on Leaderboard · Earned +{submissionStatus.xp || 0} Virtual XP
                    </p>
                    {submissionStatus.badges && submissionStatus.badges.length > 0 && (
                      <p className="mt-1 text-amber-300">
                        Unlocked Badge: {submissionStatus.badges.join(', ')}
                      </p>
                    )}
                  </div>
                )}
                {submissionStatus.error && (
                  <p className="text-red-400">{submissionStatus.error}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-6">
                Sign in with your account to publish scores to the national leaderboard and earn virtual XP badges.
              </p>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={startGame}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {lang === 'ur' ? 'دوبارہ کھیلیں' : 'Play Again'}
              </button>
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {lang === 'ur' ? 'لابی میں واپس' : 'Return to Lobby'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
