process.stdin.resume();
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify([{ fixtureId: "wrong-shape" }]));
});
