// Configuration for the application
export const CONFIG = {
  weights: { maxReps: 0.6, oneRep: 0.4 },
  medals: {
    gold: "#d6af36",
    silver: "#d7d7d7",
    bronze: "#a77044",
  },
  exercises: {
    "muscle-up": { name: "Muscle Up", multiplier: 3.0 },
    "pull-up": { name: "Pull Up", multiplier: 1.8 },
    "chin-up": { name: "Chin Up", multiplier: 1.5 },
    dip: { name: "Dip", multiplier: 1.4 },
    "push-up": { name: "Push Up", multiplier: 1.3 },
    press: { name: "Bench Press", multiplier: 1.2 },
  },
  defaults: { weight: 70 },
};

export const MIN_LOADING_TIME_MS = 400;

export const SUPABASE_CONFIG = {
  url: "https://wucacawlvnmsjufprulv.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y2FjYXdsdm5tc2p1ZnBydWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjI3NDksImV4cCI6MjA1ODgzODc0OX0.aTj4rMpYmruKepNes9qo6lyztR11EJkxT1p5BLI5uY4",
};
