const EXPECTED_IN = "90979baa1d0e24b41b5c304c5ddaf77450692d5a";
const EXPECTED_OUT = "cf430e87081b315976d9041bad6dade15d5c4cf7";
const FILENAME = "Kirby's Speedrun.gb";
const JAPANESE = ["1e34b7beee30e350087771b3a3e05a40e4a1ea84", "5fe35fab25299b6c53b40decfe2b1827b4a64d2a"];
const JAPANESE_HINT = "This patch is only compatible with the US/Europe release of the game.";

const drop = document.getElementById("drop");
const file = document.getElementById("file");
const status = document.getElementById("status");

function fail(expected, actual, hint) {
	status.hidden = false;
	status.innerHTML = "Patch failed. Checksum mismatch."
		+ '<div class="hashes">'
		+ '<span>Expected:</span><span class="v">' + expected + "</span>"
		+ '<span>Actual:</span><span class="v">' + actual + "</span>"
		+ "</div>"
		+ (hint ? "<p>" + hint + "</p>" : "");
}

function hex(buf) {
	return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha1(buf) {
	return hex(await crypto.subtle.digest("SHA-1", buf));
}

function applyIps(rom, patch) {
	const out = new Uint8Array(rom);
	let p = 5;
	while (p + 3 <= patch.length) {
		if (patch[p] === 0x45 && patch[p + 1] === 0x4f && patch[p + 2] === 0x46) break;
		const offset = (patch[p] << 16) | (patch[p + 1] << 8) | patch[p + 2];
		p += 3;
		const size = (patch[p] << 8) | patch[p + 1];
		p += 2;
		if (size === 0) {
			const run = (patch[p] << 8) | patch[p + 1];
			p += 2;
			out.fill(patch[p], offset, offset + run);
			p += 1;
		} else {
			out.set(patch.subarray(p, p + size), offset);
			p += size;
		}
	}
	return out;
}

function download(bytes) {
	const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = FILENAME;
	a.click();
	URL.revokeObjectURL(url);
}

async function patch(f) {
	status.hidden = true;

	const rom = await f.arrayBuffer();
	const got = await sha1(rom);
	if (got !== EXPECTED_IN) {
		fail(EXPECTED_IN, got, JAPANESE.includes(got) ? JAPANESE_HINT : null);
		return;
	}

	const res = await fetch("kirby's_speedrun.ips");
	const ips = new Uint8Array(await res.arrayBuffer());
	const out = applyIps(rom, ips);
	const check = await sha1(out);
	if (check !== EXPECTED_OUT) {
		fail(EXPECTED_OUT, check);
		return;
	}

	download(out);
}

drop.addEventListener("click", () => file.click());
file.addEventListener("change", () => {
	if (file.files[0]) patch(file.files[0]);
});

for (const name of ["dragenter", "dragover"]) {
	drop.addEventListener(name, e => {
		e.preventDefault();
		drop.classList.add("over");
	});
}
drop.addEventListener("dragleave", e => {
	e.preventDefault();
	drop.classList.remove("over");
});
drop.addEventListener("drop", e => {
	e.preventDefault();
	drop.classList.remove("over");
	if (e.dataTransfer.files[0]) patch(e.dataTransfer.files[0]);
});

for (const name of ["dragover", "drop"]) {
	window.addEventListener(name, e => e.preventDefault());
}
