export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';

export type QuizQuestion = {
  id: string;
  image: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
  classAssignment: string;
  verified: boolean;
  category: 'Guru Parampara' | 'Tug of War';
  subject: string;
  difficulty: QuizDifficulty;
  explanation: string;
};

export type TugOfWarSettings = {
  enabled: boolean;
  questionCount: number;
  timerDuration: number;
  category: 'Tug of War';
  classSelection: 'ALL' | 'CLASS 3' | 'CLASS 4' | 'CLASS 5' | 'CLASS 6' | 'CLASS 7';
  difficulty: 'ALL' | QuizDifficulty;
  randomQuestions: boolean;
};

export const defaultTugOfWarSettings: TugOfWarSettings = {
  enabled: true,
  questionCount: 10,
  timerDuration: 15,
  category: 'Tug of War',
  classSelection: 'ALL',
  difficulty: 'ALL',
  randomQuestions: true,
};

const tugImage = '/guru-assets/guru-maharaj.jpg';

export const initialQuestionBank: QuizQuestion[] = [
  {
    id: 'portrait-guru-maharaj',
    image: tugImage,
    question: 'Select the name belonging to the portrait shown above.',
    options: ['Guru Maharaj'],
    correctAnswer: 0,
    points: 20,
    classAssignment: 'CLASS 3',
    verified: false,
    category: 'Guru Parampara',
    subject: 'Gurukul',
    difficulty: 'Easy',
    explanation: 'This is the supplied Guru Maharaj visit portrait.',
  },
  // ---------- CLASS 3 · Mathematics (Easy) ----------
  { id: 'tug-01', image: tugImage, question: 'What is 7 + 8?', options: ['14', '15', '16', '17'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 3', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '7 + 8 = 15.' },
  { id: 'tug-02', image: tugImage, question: 'What is 12 − 5?', options: ['6', '7', '8', '9'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 3', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '12 − 5 = 7.' },
  { id: 'tug-03', image: tugImage, question: 'What is 6 × 3?', options: ['16', '18', '21', '24'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 3', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '6 × 3 = 18.' },
  { id: 'tug-04', image: tugImage, question: 'What is 20 ÷ 4?', options: ['4', '5', '6', '8'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 3', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '20 ÷ 4 = 5.' },
  { id: 'tug-05', image: tugImage, question: 'What is double of 9?', options: ['16', '18', '19', '20'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 3', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: 'Double of 9 is 9 + 9 = 18.' },
  { id: 'tug-06', image: tugImage, question: 'What is 100 − 45?', options: ['45', '55', '65', '75'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 3', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '100 − 45 = 55.' },
  // ---------- CLASS 4 · Mathematics (Easy–Medium) ----------
  { id: 'tug-07', image: tugImage, question: 'What is 14 × 3?', options: ['36', '39', '42', '44'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 4', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '14 × 3 = 42.' },
  { id: 'tug-08', image: tugImage, question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '14'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 4', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '144 ÷ 12 = 12.' },
  { id: 'tug-09', image: tugImage, question: 'What is 250 + 175?', options: ['405', '415', '425', '435'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 4', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '250 + 175 = 425.' },
  { id: 'tug-10', image: tugImage, question: 'What is 500 − 268?', options: ['212', '222', '232', '242'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 4', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '500 − 268 = 232.' },
  { id: 'tug-11', image: tugImage, question: 'What is 9 × 9?', options: ['72', '78', '81', '90'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 4', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Easy', explanation: '9 × 9 = 81.' },
  { id: 'tug-12', image: tugImage, question: 'What is half of 96?', options: ['42', '46', '48', '52'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 4', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: 'Half of 96 is 96 ÷ 2 = 48.' },
  // ---------- CLASS 5 · Mathematics (Medium) ----------
  { id: 'tug-13', image: tugImage, question: 'Write 3/4 as a decimal.', options: ['0.25', '0.5', '0.75', '0.34'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 5', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '3 ÷ 4 = 0.75.' },
  { id: 'tug-14', image: tugImage, question: 'What is 15% of 200?', options: ['20', '25', '30', '35'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 5', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '15% of 200 = (15/100) × 200 = 30.' },
  { id: 'tug-15', image: tugImage, question: 'What is 7 × 13?', options: ['81', '84', '88', '91'], correctAnswer: 3, points: 1, classAssignment: 'CLASS 5', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '7 × 13 = 91.' },
  { id: 'tug-16', image: tugImage, question: 'A square has a side of 9 cm. What is its perimeter?', options: ['27', '32', '36', '81'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 5', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: 'Perimeter = 4 × side = 4 × 9 = 36 cm.' },
  { id: 'tug-17', image: tugImage, question: 'What is 144 ÷ 8?', options: ['16', '17', '18', '19'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 5', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '144 ÷ 8 = 18.' },
  { id: 'tug-18', image: tugImage, question: 'What is the average of 4, 6 and 8?', options: ['5', '6', '7', '9'], correctAnswer: 1, points: 1, classAssignment: 'CLASS 5', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '(4 + 6 + 8) ÷ 3 = 18 ÷ 3 = 6.' },
  // ---------- CLASS 6 · Mathematics (Medium–Hard) ----------
  { id: 'tug-19', image: tugImage, question: 'Solve for x: 4x = 52.', options: ['11', '12', '13', '14'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 6', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: 'x = 52 ÷ 4 = 13.' },
  { id: 'tug-20', image: tugImage, question: 'What is 15²?', options: ['205', '215', '225', '235'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 6', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '15 × 15 = 225.' },
  { id: 'tug-21', image: tugImage, question: 'Simplify 18/24 to its lowest terms.', options: ['1/2', '2/3', '3/4', '4/5'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 6', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: '18/24 divides by 6 to give 3/4.' },
  { id: 'tug-22', image: tugImage, question: 'Solve for x: 2x − 5 = 21.', options: ['11', '12', '13', '14'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 6', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: '2x = 26, so x = 13.' },
  { id: 'tug-23', image: tugImage, question: 'A rectangle is 12 cm by 7 cm. What is its area?', options: ['74', '78', '82', '84'], correctAnswer: 3, points: 1, classAssignment: 'CLASS 6', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: 'Area = length × breadth = 12 × 7 = 84 cm².' },
  { id: 'tug-24', image: tugImage, question: 'What is the sum of the interior angles of a quadrilateral?', options: ['180', '270', '360', '450'], correctAnswer: 2, points: 1, classAssignment: 'CLASS 6', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Medium', explanation: 'The angles of any quadrilateral add up to 360°.' },
  // ---------- CLASS 7 · Mathematics (Hard — a little tougher) ----------
  { id: 'tug-25', image: tugImage, question: 'Solve for x: 3x + 7 = 34.', options: ['7', '8', '9', '10'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: '3x = 27, so x = 9.' },
  { id: 'tug-26', image: tugImage, question: 'What is 5² − 3²?', options: ['4', '8', '16', '34'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: '25 − 9 = 16.' },
  { id: 'tug-27', image: tugImage, question: 'Find the simple interest on ₹1000 at 5% per year for 2 years.', options: ['50', '75', '100', '150'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: 'SI = (P × R × T) / 100 = (1000 × 5 × 2) / 100 = 100.' },
  { id: 'tug-28', image: tugImage, question: 'What is the square root of 225?', options: ['13', '14', '15', '16'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: '15 × 15 = 225, so √225 = 15.' },
  { id: 'tug-29', image: tugImage, question: 'A train covers 180 km in 3 hours. What is its speed in km/h?', options: ['45', '50', '60', '65'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: 'Speed = Distance ÷ Time = 180 ÷ 3 = 60 km/h.' },
  { id: 'tug-30', image: tugImage, question: 'Solve for x: x/4 + 5 = 12.', options: ['24', '26', '28', '30'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: 'x/4 = 7, so x = 28.' },
  { id: 'tug-31', image: tugImage, question: 'Simplify: (−8) + 15 − 6.', options: ['−1', '0', '1', '13'], correctAnswer: 2, points: 2, classAssignment: 'CLASS 7', verified: true, category: 'Tug of War', subject: 'Mathematics', difficulty: 'Hard', explanation: '−8 + 15 = 7, then 7 − 6 = 1.' },
];