/*
  How much better (or worse) a class clears bosses than MapleScouter's figures predict, from real
  GMS solo clears: the time a clear actually took against the Boss Clear % MapleScouter gave that
  character. The local engine multiplies the class's damage by it before turning damage into HEXA
  and Boss Clear %, so a factor of 1.3 shows the HEXA of a sheet that deals 30% more damage.

  Factors are relative to the KMS classes MapleScouter models from KMS data: their close clears
  sit at a median of 0.92 of MapleScouter's figure on every boss, the normal gap between a typical
  uploaded clear and MapleScouter's 100%, so a class's factor is its own median divided by that.
  KMS classes stay at 1, and every class keeps MapleScouter's scale, where near-perfect play
  clears around 90%.

  Only classes whose clears agree closely are listed. Every other class uses MapleScouter's figures
  unchanged. Values use close clears only (at least 85% of the timer used) uploaded since the last
  MapleScouter cut update and each class's and boss's latest rework, rounded down, so the estimate
  leans toward needing slightly more than the real minimum. The clear log and method are kept in
  MapleDoro's separate boss-clears dataset.
*/

export const CLASS_CLEAR_FACTOR: Readonly<Partial<Record<string, number>>> = {
  // 12 close clears, median 1.28 (1.39 against the KMS classes). Rounded down further: her random
  // cooldown resets make uploaded runs skew luckier than most classes'.
  kanna: 1.3,
  // 11 close clears, median 1.07 (1.16 against the KMS classes).
  mo_xuan: 1.15,
  // 6 close clears, median 1.05 (1.14 against the KMS classes), 0.94 to 1.28.
  hayato: 1.1,
};
