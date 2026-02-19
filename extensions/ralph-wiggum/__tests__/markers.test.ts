/**
 * Tests for prompt/markers.ts — strict marker protocol parser.
 */
import { describe, test, expect } from "bun:test";
import { detectPromiseMarker } from "../prompt/markers.ts";

describe("detectPromiseMarker", () => {
	test("COMPLETE marker on its own line → 'COMPLETE'", () => {
		expect(detectPromiseMarker("<promise>COMPLETE</promise>")).toBe("COMPLETE");
	});

	test("ABORT marker on its own line → 'ABORT'", () => {
		expect(detectPromiseMarker("<promise>ABORT</promise>")).toBe("ABORT");
	});

	test("marker embedded in a sentence (not standalone) → null", () => {
		expect(
			detectPromiseMarker("I think <promise>COMPLETE</promise> is correct"),
		).toBeNull();
	});

	test("marker in quotes on same line → null (not standalone)", () => {
		expect(
			detectPromiseMarker('Output: "<promise>COMPLETE</promise>" when done'),
		).toBeNull();
	});

	test("both COMPLETE and ABORT present → conflict → null", () => {
		expect(
			detectPromiseMarker(
				"<promise>COMPLETE</promise>\n<promise>ABORT</promise>",
			),
		).toBeNull();
	});

	test("empty string → null", () => {
		expect(detectPromiseMarker("")).toBeNull();
	});

	test("multi-line with marker on one line → detected", () => {
		const text = [
			"Working on the task...",
			"Done with all items.",
			"<promise>COMPLETE</promise>",
			"That's all.",
		].join("\n");
		expect(detectPromiseMarker(text)).toBe("COMPLETE");
	});

	test("marker with leading/trailing whitespace → trim matches", () => {
		expect(detectPromiseMarker("   <promise>COMPLETE</promise>   ")).toBe(
			"COMPLETE",
		);
		expect(detectPromiseMarker("\t<promise>ABORT</promise>\t")).toBe("ABORT");
	});

	test("CRLF line endings → detected", () => {
		expect(
			detectPromiseMarker("line1\r\n<promise>ABORT</promise>\r\nline3"),
		).toBe("ABORT");
	});

	test("partial / typo markers → null", () => {
		expect(detectPromiseMarker("<promise>COMPLET</promise>")).toBeNull();
		expect(detectPromiseMarker("<promise>complete</promise>")).toBeNull();
		expect(detectPromiseMarker("COMPLETE")).toBeNull();
		expect(detectPromiseMarker("<promise>ABORT<promise>")).toBeNull();
	});

	test("marker appears multiple times (same kind) → still detected", () => {
		expect(
			detectPromiseMarker(
				"<promise>COMPLETE</promise>\nstuff\n<promise>COMPLETE</promise>",
			),
		).toBe("COMPLETE");
	});

	test("marker inside fenced code block (```) → ignored", () => {
		const text = [
			"Here is an example:",
			"```",
			"<promise>COMPLETE</promise>",
			"```",
		].join("\n");
		expect(detectPromiseMarker(text)).toBeNull();
	});

	test("marker inside ~~~ fence → ignored", () => {
		const text = [
			"~~~markdown",
			"<promise>ABORT</promise>",
			"~~~",
		].join("\n");
		expect(detectPromiseMarker(text)).toBeNull();
	});

	test("marker inside fence but also outside → detected (outside one)", () => {
		const text = [
			"```",
			"<promise>ABORT</promise>",
			"```",
			"<promise>COMPLETE</promise>",
		].join("\n");
		expect(detectPromiseMarker(text)).toBe("COMPLETE");
	});

	test("nested/multiple fences → correct tracking", () => {
		const text = [
			"```",
			"<promise>COMPLETE</promise>",
			"```",
			"some text",
			"```",
			"<promise>ABORT</promise>",
			"```",
		].join("\n");
		expect(detectPromiseMarker(text)).toBeNull(); // both inside fences
	});

	test("unclosed fence → rest of text treated as inside fence", () => {
		const text = [
			"```",
			"<promise>COMPLETE</promise>",
		].join("\n");
		expect(detectPromiseMarker(text)).toBeNull();
	});
});
