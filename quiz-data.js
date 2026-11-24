// Test savollari SERVERDA turadi, shuning uchun to'g'ri javoblarni brauzerdan ko'rib bo'lmaydi.
module.exports = [
  { q: "「私は学生です」 nima degani?", o: ["Men o'qituvchiman", "Men talabaman", "Bu kitob"], a: 1, e: "学生 (gakusei) - talaba." },
  { q: "「あ」 qanday o'qiladi?", o: ["a", "i", "u"], a: 0, e: "あ - 'a' tovushi." },
  { q: "「水」 so'zining ma'nosi?", o: ["Olov", "Suv", "Daraxt"], a: 1, e: "水 (mizu) - suv." },
  { q: "「先生」 qanday o'qiladi?", o: ["gakusei", "sensei", "nihon"], a: 1, e: "先生 (sensei) - o'qituvchi." },
  { q: "「は」 gapda mavzu bildirganda qanday o'qiladi?", o: ["ha", "wa", "ba"], a: 1, e: "Zarracha sifatida は 'wa' deb o'qiladi." },
  { q: "「日本」 nima?", o: ["Xitoy", "Koreya", "Yaponiya"], a: 2, e: "日本 (nihon) - Yaponiya." },
  { q: "「コーヒー」 qaysi yozuvda?", o: ["Hiragana", "Katakana", "Kanji"], a: 1, e: "Chet tilidan kirgan so'zlar katakana bilan yoziladi." },
  { q: "「月」 kanjisining ma'nosi?", o: ["Quyosh", "Oy", "Odam"], a: 1, e: "月 (tsuki) - oy." },
  { q: "「です」 gapda nima vazifa bajaradi?", o: ["Gapni xushmuomala tugatadi", "Savol beradi", "Inkor qiladi"], a: 0, e: "です - xushmuomala tugallovchi." },
  { q: "「人」 qanday o'qiladi (kunyomi)?", o: ["ひと", "みず", "つき"], a: 0, e: "人 (hito) - odam." }
];
