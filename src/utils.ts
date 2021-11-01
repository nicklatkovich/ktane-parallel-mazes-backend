export function randomString(set: string, length: number): string {
	return new Array(length).fill(0).map(_ => set[Math.floor(Math.random() * set.length)]).join("");
}
