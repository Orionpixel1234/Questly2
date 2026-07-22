export interface StudyQa {
  q: string;
  a: string;
  answers?: string[];
}

// Shared answer-checking rule across Bomb Blast and Jumping Jacks: exact
// match (normalized) or the submitted text is a substantial substring of an
// accepted answer — lets "Paris" match "the city of Paris" without being so
// loose a single shared word counts.
export function isAnswerCorrect(input: string, qa: StudyQa): boolean {
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;]$/g, '');
  const accepted = (qa.answers && qa.answers.length ? qa.answers : [qa.a]).filter(Boolean);
  const given = normalize(input);
  return accepted.some((answer) => {
    const normalized = normalize(answer);
    return given === normalized || (normalized.includes(given) && given.length >= 3);
  });
}
