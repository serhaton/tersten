import type { Lang } from './i18n';

export type ConceptId = 'futbol' | 'cadilar' | 'unluler' | 'arabalar' | 'hayvanlar' | 'yemekler' | 'diger';

export type Concept = {
  id: ConceptId;
  title: Record<Lang, string>;
  emoji: string;
  /** Wallpaper gradient, top to bottom. */
  colors: [string, string, string];
  /** Accent used for the card titles and the primary buttons. */
  accent: string;
  /** Emojis scattered on the wallpaper. */
  stickers: string[];
  /** Secret word suggestions for player 1. Empty means free format. */
  words: Record<Lang, string[]>;
};

// World-famous names shared by both languages.
// Footballers and celebrities are always written with first and last name.
const WORLD_FOOTBALLERS = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappé', 'Erling Haaland', 'Zinedine Zidane',
  'Diego Maradona', 'Luka Modrić', 'Lamine Yamal', 'David Beckham', 'Mohamed Salah',
  'Karim Benzema', 'Harry Kane', 'Kevin De Bruyne', 'Robert Lewandowski', 'Jude Bellingham',
];
const WORLD_CELEBRITIES = [
  'Taylor Swift', 'Brad Pitt', 'Leonardo DiCaprio', 'Michael Jackson', 'Tom Cruise', 'Lady Gaga',
  'Ed Sheeran', 'Elvis Presley', 'Charlie Chaplin', 'Angelina Jolie', 'Jennifer Lopez', 'Keanu Reeves',
];

export const CONCEPTS: Concept[] = [
  {
    id: 'futbol',
    title: { tr: 'Futbolcular', en: 'Footballers' },
    emoji: '⚽',
    colors: ['#0FA34A', '#0B7F39', '#05461F'],
    accent: '#0B8F3A',
    stickers: ['⚽', '🏆', '👟', '🥅', '🧤', '🏟️'],
    words: {
      tr: [
        ...WORLD_FOOTBALLERS, 'Arda Güler', 'Kenan Yıldız', 'Hakan Çalhanoğlu', 'Mauro Icardi', 'Victor Osimhen',
        'Gheorghe Hagi', 'Alex de Souza', 'Rüştü Reçber', 'Hakan Şükür', 'Arda Turan', 'Ferdi Kadıoğlu', 'Fernando Muslera',
      ],
      en: WORLD_FOOTBALLERS,
    },
  },
  {
    id: 'cadilar',
    title: { tr: 'Cadılar Bayramı', en: 'Halloween' },
    emoji: '🎃',
    colors: ['#1A0833', '#4B1679', '#E8641B'],
    accent: '#7A2BC2',
    stickers: ['🎃', '👻', '🦇', '🕸️', '🧙‍♀️', '💀', '🕷️', '🍬'],
    words: {
      tr: ['Balkabağı', 'Hayalet', 'Vampir', 'Cadı', 'Süpürge', 'İskelet', 'Örümcek', 'Zombi', 'Mumya', 'Yarasa', 'Şeker', 'Kostüm', 'Kurt adam', 'Mezarlık', 'Kazan'],
      en: ['Pumpkin', 'Ghost', 'Vampire', 'Witch', 'Broomstick', 'Skeleton', 'Spider', 'Zombie', 'Mummy', 'Bat', 'Candy', 'Costume', 'Werewolf', 'Graveyard', 'Cauldron'],
    },
  },
  {
    id: 'unluler',
    title: { tr: 'Ünlüler', en: 'Celebrities' },
    emoji: '⭐',
    colors: ['#FF3CAC', '#784BA0', '#2B86C5'],
    accent: '#C2187A',
    stickers: ['⭐', '🎤', '🎬', '📸', '🕶️', '💃', '🌟', '🎶'],
    words: {
      tr: [
        ...WORLD_CELEBRITIES, 'Sezen Aksu', 'Cem Yılmaz', 'Barış Manço', 'Ajda Pekkan', 'Kenan İmirzalıoğlu',
        'Şahan Gökbakar', 'Kemal Sunal', 'Müslüm Gürses', 'Zeki Müren', 'Haluk Bilginer', 'Kıvanç Tatlıtuğ',
        'Hande Erçel', 'Ata Demirer', 'Yılmaz Erdoğan',
      ],
      en: [
        ...WORLD_CELEBRITIES, 'Elon Musk', 'Will Smith', 'Johnny Depp', 'Billie Eilish', 'Justin Bieber',
        'Selena Gomez', 'Dwayne Johnson', 'Ariana Grande', 'Bruno Mars', 'Morgan Freeman',
      ],
    },
  },
  {
    id: 'arabalar',
    title: { tr: 'Arabalar', en: 'Car Brands' },
    emoji: '🏎️',
    colors: ['#F2344B', '#B0122A', '#1B1B3A'],
    accent: '#D7263D',
    stickers: ['🚗', '🏎️', '🏁', '🛞', '🚙', '⛽', '🚕'],
    words: {
      tr: ['Ferrari', 'Lamborghini', 'Mercedes', 'Volkswagen', 'Toyota', 'Tesla', 'Porsche', 'Renault', 'Togg', 'Fiat', 'Peugeot', 'Hyundai', 'Bugatti', 'Maserati', 'Opel'],
      en: ['Ferrari', 'Lamborghini', 'Mercedes', 'Volkswagen', 'Toyota', 'Tesla', 'Porsche', 'Ford', 'Chevrolet', 'Honda', 'Jaguar', 'Bugatti', 'Maserati', 'Cadillac', 'Rolls-Royce'],
    },
  },
  {
    id: 'hayvanlar',
    title: { tr: 'Hayvanlar', en: 'Animals' },
    emoji: '🦁',
    colors: ['#FFD23F', '#F39237', '#B5501A'],
    accent: '#E07A12',
    stickers: ['🦁', '🐘', '🦒', '🐒', '🐧', '🐊', '🦜', '🐢'],
    words: {
      tr: ['Zürafa', 'Timsah', 'Penguen', 'Kanguru', 'Fil', 'Aslan', 'Kaplumbağa', 'Ahtapot', 'Papağan', 'Su aygırı', 'Kirpi', 'Kelebek', 'Gergedan', 'Yunus'],
      en: ['Giraffe', 'Crocodile', 'Penguin', 'Kangaroo', 'Elephant', 'Lion', 'Turtle', 'Octopus', 'Parrot', 'Hippo', 'Hedgehog', 'Butterfly', 'Rhino', 'Dolphin'],
    },
  },
  {
    id: 'yemekler',
    title: { tr: 'Yemekler', en: 'Food' },
    emoji: '🍕',
    colors: ['#FF9A8B', '#FF6A88', '#C2306B'],
    accent: '#E5466E',
    stickers: ['🍕', '🍔', '🌮', '🍩', '🍦', '🥐', '🍉', '🧁'],
    words: {
      tr: ['Lahmacun', 'Mantı', 'Baklava', 'İskender', 'Kokoreç', 'Menemen', 'Pizza', 'Hamburger', 'Sushi', 'Dondurma', 'Simit', 'Kumpir', 'Künefe', 'Spagetti'],
      en: ['Pizza', 'Hamburger', 'Sushi', 'Spaghetti', 'Pancake', 'Taco', 'Hot dog', 'Donut', 'Croissant', 'Popcorn', 'Lasagna', 'Burrito', 'Ice cream', 'Cheesecake'],
    },
  },
  {
    id: 'diger',
    title: { tr: 'Diğer', en: 'Anything' },
    emoji: '❓',
    colors: ['#00C9FF', '#5B6CFF', '#B14BFF'],
    accent: '#5B4BE0',
    stickers: ['❓', '💬', '✨', '🎲', '💡', '🤔'],
    words: { tr: [], en: [] },
  },
];

/** Colors for the concept picker wallpaper. */
export const PICKER_COLORS: [string, string, string] = ['#6B4BD8', '#E6306B', '#FFB224'];
export const PICKER_STICKERS = ['⚽', '🎃', '⭐', '🏎️', '🦁', '🍕', '🎤', '👻'];
