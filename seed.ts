import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const hardcodedMovies = [
  {
    type: "movie",
    title: "Kalki 2898 AD",
    description: "A modern myth-verse, blending science fiction with Indian mythology, set in a dystopian future where humanity's last hope rests on an unborn child.",
    category: "Sci-Fi",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=1000&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
    ],
    link620p: "https://example.com/kalki-620",
    link720p: "https://example.com/kalki-720",
    link1080p: "https://example.com/kalki-1080",
    ratings: [4, 5, 5, 4],
  },
  {
    type: "movie",
    title: "Fighter",
    description: "Top IAF aviators come together in the face of imminent danger, to form Air Dragons. Fighter unfolds their camaraderie, brotherhood and battles, internal and external.",
    category: "Action",
    image: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=1000&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1474314115101-05d4a544c1c9?auto=format&fit=crop&w=800&q=80",
    ],
    link620p: "https://example.com/fighter-620",
    link720p: "https://example.com/fighter-720",
    link1080p: "https://example.com/fighter-1080",
    ratings: [3, 4, 5],
  },
  {
    type: "series",
    title: "Stranger Things",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    category: "Sci-Fi",
    image: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1000&auto=format&fit=crop",
    screenshots: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80",
    ],
    episodes: [
      { id: 1, title: "Episode 1", link: "https://example.com/st-e1" },
      { id: 2, title: "Episode 2", link: "https://example.com/st-e2" },
      { id: 3, title: "Episode 3", link: "https://example.com/st-e3" },
    ],
    ratings: [5, 5, 4, 5],
  },
];

async function seed() {
  for (let i = 0; i < hardcodedMovies.length; i++) {
    const movie = hardcodedMovies[i];
    await setDoc(doc(db, "movies", "seeded_movie_" + i), movie);
    console.log("Added", movie.title);
  }
  process.exit(0);
}

seed().catch(console.error);
