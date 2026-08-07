function def(id, title, desc, icon, check) {
  return { id, title, desc, icon, check };
}

export const ACHIEVEMENTS = [
  // Digitação
  def("first_race", "Primeira corrida", "Complete sua primeira corrida de digitação", "keyboard", (s) => s.total >= 1),
  def("races_100", "Centena", "Complete 100 corridas", "gauge", (s) => s.total >= 100),
  def("races_1000", "Milhão de dedos", "Complete 1.000 corridas", "crown", (s) => s.total >= 1000),
  // Precisão
  def("acc_100", "Perfeição", "Atingiu 100% de precisão em uma corrida", "shield", (s) => s.acc100 >= 1),
  def("acc_99", "Quase perfeito", "Atingiu 99% ou mais de precisão", "star", (s) => s.acc99 >= 1),
  def("acc_95", "Cristal", "Atingiu 95% ou mais de precisão em 10 corridas", "drop", (s) => s.acc95 >= 10),
  // Velocidade
  def("wpm_50", "Vouando", "Alcance 50 PPM em uma corrida", "bolt", (s) => s.bestWpm >= 50),
  def("wpm_100", "Veloz", "Alcance 100 PPM em uma corrida", "lightning", (s) => s.bestWpm >= 100),
  def("wpm_150", "Turbo", "Alcance 150 PPM em uma corrida", "rocket", (s) => s.bestWpm >= 150),
  // Linguagens
  def("lang_java", "Mestre Java", "5 corridas em Java", "code", (s) => (s.langs["java"] || 0) >= 5),
  def("lang_python", "Mestre Python", "5 corridas em Python", "code", (s) => (s.langs["python"] || 0) >= 5),
  def("lang_csharp", "Mestre C#", "5 corridas em C#", "code", (s) => (s.langs["csharp"] || 0) >= 5),
  def("fullstack", "Full Stack", "Corridas em pelo menos 4 linguagens", "layers", (s) => s.languages >= 4),
  // Frequência
  def("streak_7", "Semana", "Pratique por 7 dias", "calendar", (s) => s.streak7 >= 7),
  def("streak_30", "Mês", "Pratique por 30 dias", "calendar", (s) => s.streak30 >= 30),
  def("streak_365", "Ano", "Pratique por 365 dias", "trophy", (s) => s.streak365 >= 365),
];

function activityStreakMax(daysSet) {
  let best = 0;
  let run = 0;
  const sorted = [...daysSet].sort((a, b) => (a < b ? -1 : 1));
  let prev = null;
  for (const d of sorted) {
    const cur = new Date(d + "T00:00:00Z");
    if (prev) {
      const gap = Math.round((cur - prev) / 86400000);
      run = gap === 1 ? run + 1 : 0;
    }
    prev = cur;
    if (run > best) best = run;
  }
  return best + (sorted.length > 0 ? 1 : 0);
}

export function evaluate(agg) {
  const daysSet = new Set(agg.activityDays || []);
  const streakMax = activityStreakMax(daysSet);
  const ctx = {
    ...agg,
    streak7: streakMax,
    streak30: streakMax,
    streak365: streakMax,
  };
  return ACHIEVEMENTS.map((a) => {
    const unlocked = a.check(ctx);
    return { id: a.id, title: a.title, desc: a.desc, icon: a.icon, unlocked };
  });
}

export function unlockedCount(list) {
  return list.filter((a) => a.unlocked).length;
}