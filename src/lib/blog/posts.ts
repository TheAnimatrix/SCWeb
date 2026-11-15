import type { BlogPost } from './types';

export type { BlogBlock, BlogCategory, BlogPost } from './types';
export { formatPostDate } from './types';

const DISCORD_URL = 'https://discord.gg/UQ74TQfMqM';
const ILLUSTRATION_CREDIT = 'Illustration made with an AI image tool.';

/**
 * Writing rules for this file: say things we know first-hand, name real products and real
 * pages, and leave out anything that isn't built yet unless the post says so plainly.
 * No pull quotes unless a named person said the words.
 */
const postDrafts: Omit<BlogPost, 'readingMinutes'>[] = [
	{
		slug: 'why-india-needs-selfcrafted',
		cover: {
			src: '/images/blog/board-and-box.webp',
			alt: 'Line drawing of a small radio board with pin headers, a USB-C socket and a coiled antenna, next to an open cardboard box.',
			width: 1400,
			height: 933,
			ogSrc: '/images/blog/board-and-box-og.jpg',
			lineArt: true,
			credit: ILLUSTRATION_CREDIT
		},
		title: "India needs a home for hardware that isn't for everyone",
		excerpt:
			"We couldn't find a good place to sell a small-batch board in India, so we built one. This is the thinking behind it.",
		category: 'Notes',
		publishedAt: '2026-09-10',
		updatedAt: '2026-11-15',
		body: [
			{
				type: 'paragraph',
				text: 'LorNode is a small LoRa board we make. The first version went to a closed group of people in late 2023. They told us what was wrong with it, and the second version fixed those things. Then came the awkward part: where do you sell a board like that in India?'
			},
			{ type: 'heading', text: 'Why not just sell on Amazon?' },
			{
				type: 'paragraph',
				text: 'You can. Amazon India has a seller registration route, and Robu has a seller enquiry form. If you have a finished product and need somewhere to list it, look at both.',
				links: [
					{ label: 'Amazon India seller information', href: 'https://sell.amazon.in/sell-online' },
					{ label: 'Robu seller form', href: 'https://robu.in/seller-form/' }
				]
			},
			{
				type: 'paragraph',
				text: "Our own attempt didn't get far. We wrote to Robu about listing LorNode and never heard back. We don't know why, and one unanswered enquiry says nothing about how they treat anyone else. It did leave us with a board and nowhere obvious to put it."
			},
			{
				type: 'paragraph',
				text: "It also made us think about every other small product in the same spot. Whether it gets a chance shouldn't depend on someone else's catalogue having room for it."
			},
			{
				type: 'paragraph',
				text: "And a listing only solves part of the problem. While you're still working a product out, the questions are different. Who wants the smaller version? Is that extra feature useful, or did you just enjoy adding it? Who will try the rough first revision and tell you what to fix? LorNode got better because a few people did exactly that. A page that sells the finished thing doesn't find you those people."
			},
			{ type: 'heading', text: 'Small audience, any batch size' },
			{
				type: 'paragraph',
				text: 'People tend to treat "niche" and "low volume" as the same thing. A hobby community might want twenty of a very particular accessory. A small business might need that same accessory by the hundred, again and again. Both audiences are niche. Only one of them is a small batch.'
			},
			{
				type: 'paragraph',
				text: "That's the hardware we want on Selfcrafted: things with a clear reason to exist for a specific group of people, whatever the quantity turns out to be. A project shouldn't have to cosplay as a mass-market startup to be taken seriously."
			},
			{ type: 'heading', text: 'What we want to build next' },
			{
				type: 'paragraph',
				text: 'Right now Selfcrafted is a shop. Makers list products, spares and flea-market parts, and there is a 3D printing service where you send a model to a maker who owns a printer.'
			},
			{
				type: 'paragraph',
				text: "The part we haven't built is the part before a product is finished. We'd like buyers to be able to follow a project while it can still change, and tell the maker what would make it better. You shouldn't need to design a circuit board to say \"this would be perfect if I could use it one-handed.\" Makers, hobbyists and buyers notice different things, and the useful time to hear from all of them is before the design is frozen."
			},
			{
				type: 'paragraph',
				text: "We don't know yet what that looks like on the site. We've set ourselves one rule: taking part has to lead to a better product, or to a clearer idea of what people need. Clicks for their own sake don't count."
			},
			{ type: 'heading', text: 'Why a platform of our own' },
			{
				type: 'paragraph',
				text: "You can run all of this with a shop page, a chat group, a feedback form and a long trail of DMs. People do. The trouble is that somebody has to carry the context between those places, and it's usually the maker. The buyer sees a listing. The maker sees a dozen scattered requests. Nobody sees how the product got to where it is."
			},
			{
				type: 'paragraph',
				text: 'We want those to live in one place. And we want a maker in India to have somewhere to start before the product looks like an obvious retail bet, and somewhere to stay if the audience remains small.'
			},
			{
				type: 'paragraph',
				text: "That's the case for Selfcrafted. It's early. The shop works, the rest is still ahead of us, and we have to earn the attention of the people we're building it for. If you make hardware in India, apply to sell here. If something is missing, tell us on Discord.",
				links: [
					{ label: 'Apply as a maker', href: '/maker/apply' },
					{ label: 'Selfcrafted on Discord', href: DISCORD_URL }
				]
			}
		]
	},
	{
		slug: 'a-product-studio-for-the-ai-era',
		cover: {
			src: '/images/blog/sketch-and-object.webp',
			alt: 'Line drawing of a rough sketch of a wedge-shaped desk gadget on paper, the finished gadget next to it, and a digital caliper.',
			width: 1400,
			height: 933,
			ogSrc: '/images/blog/sketch-and-object-og.jpg',
			lineArt: true,
			credit: ILLUSTRATION_CREDIT
		},
		title: "A product studio we're thinking about building",
		excerpt:
			"AI can make an idea look real in an evening. We're working out what it would take to help someone get the thing made.",
		category: 'Notes',
		publishedAt: '2026-09-10',
		updatedAt: '2026-11-15',
		body: [
			{
				type: 'paragraph',
				text: "We're considering a product studio inside Selfcrafted. Nothing is built yet, and this post isn't a promise that anything is about to ship. We're writing the idea down so you can tell us where it's wrong."
			},
			{ type: 'heading', text: 'The problem' },
			{
				type: 'paragraph',
				text: 'You can spend an evening with an AI tool and come away with a name, a page and a convincing picture of a product. Then someone asks how it goes together, whether the parts fit, or who is going to make it, and the picture has nothing to say.'
			},
			{
				type: 'paragraph',
				text: "Physical products have to deal with physical reality, and somebody has to own the decisions between the nice image and the thing that arrives in a box. That gap is what we'd want a studio to help with."
			},
			{ type: 'heading', text: 'The idea' },
			{
				type: 'paragraph',
				text: "You describe what you want, or start from a bit of hardware you already have. You try a few shapes, change your mind, and work towards something that could be built. You shouldn't have to know every tool, every supplier and every question to ask before you can start."
			},
			{
				type: 'paragraph',
				text: "Then a person looks at it. The direction we're exploring sends a proposed build to an approved maker, who says what can't be made as drawn and what it would take to make it properly. An attractive concept and an agreed, makeable product are two different stages, and whoever is using the studio should be able to tell which one they're at."
			},
			{
				type: 'paragraph',
				text: 'There is a second reason we like it. A marketplace is hard to start, because buyers wait for makers and makers wait for buyers. A studio is useful to one person with one idea, before any crowd exists.'
			},
			{ type: 'heading', text: "What we haven't decided" },
			{
				type: 'list',
				items: [
					'Pricing.',
					'What the first version would do.',
					'How an order works once a maker agrees to build something.',
					"Whether a few people who want the same thing could back a batch together. We like the idea and haven't worked it through."
				]
			},
			{
				type: 'paragraph',
				text: "If you'd use something like this, or you're a maker who would hate being sent these, tell us on Discord.",
				links: [{ label: 'Selfcrafted on Discord', href: DISCORD_URL }]
			}
		]
	},
	{
		slug: 'what-to-document-before-you-ship-your-first-build',
		cover: {
			src: '/images/blog/device-and-guide.webp',
			alt: 'Line drawing of a small device with one button, its open carton, a three-step instruction sheet, four hex screws and a hex key.',
			width: 1400,
			height: 933,
			ogSrc: '/images/blog/device-and-guide-og.jpg',
			lineArt: true,
			credit: ILLUSTRATION_CREDIT
		},
		title: 'What to document before you ship your first build',
		excerpt:
			"A checklist for the sheet that goes in the box, and two tests that show you what's missing from it.",
		category: 'Guides',
		publishedAt: '2026-09-10',
		updatedAt: '2026-11-15',
		body: [
			{
				type: 'paragraph',
				text: 'While the build is on your bench, everything about it is obvious to you. You know which cable goes where and what the status light means during startup. The person opening the box knows none of it.'
			},
			{
				type: 'paragraph',
				text: "Writing the guide before you ship does a second job: it shows you what isn't finished. If setup needs a long explanation, the product probably needs another pass. If two revisions look the same and behave differently, the revision needs to be printed on the board."
			},
			{ type: 'heading', text: 'Say what this unit is' },
			{
				type: 'paragraph',
				text: 'Put these where the owner can still find them a year from now: on the board, on a sticker under the base, or in the first lines of the guide.'
			},
			{
				type: 'list',
				items: [
					'The product name and hardware revision.',
					'The firmware or configuration version it shipped with, if it has one.',
					"What's in the box, and what the buyer has to bring, such as a power supply, a cable or a memory card.",
					'The supply voltage and current, and the connector it expects.',
					'Anything that makes this unit different from the standard build.'
				]
			},
			{ type: 'heading', text: 'Write the first ten minutes' },
			{
				type: 'paragraph',
				text: 'Reset a unit, clear your desk and follow your own instructions, starting from the sealed box. Write each step as an action and what should happen next. For example: plug in USB, the green light blinks twice, then stays on. Use the names printed on the product. If the board says BOOT, the guide says BOOT.'
			},
			{
				type: 'paragraph',
				text: 'Keep optional tuning out of this part. The first page gets someone to a working device. Everything else can come after it.'
			},
			{ type: 'heading', text: 'Cover the few things that go wrong' },
			{
				type: 'paragraph',
				text: 'You don\'t need a fault tree. Write down how to restart it, how to get back to a known state, and how to tell a normal wait from a problem. Then list the few symptoms you expect, in the words a buyer would use, like "the light never turns on", each with one thing to check. End with where to ask for help.'
			},
			{
				type: 'paragraph',
				text: 'If a part is meant to be replaced, say which one and how to get another. If the case is meant to be opened, say how far.'
			},
			{ type: 'heading', text: 'Two tests before you ship' },
			{
				type: 'paragraph',
				text: 'Build a second unit using only your written notes. Wherever you stall, the process is still in your hands and not on paper: the order you tighten the screws, the wire that has to bend a certain way, the setting you changed once and forgot.'
			},
			{
				type: 'paragraph',
				text: "Then hand a unit and the draft guide to someone who hasn't watched you build it. Ask them to say out loud what they expect at each step, and don't help. Where they pause, the guide is missing something. What they think a label means matters more than what you meant by it."
			},
			{
				type: 'paragraph',
				text: 'Fix anything that stops the main task or leaves them stuck. Opinions about colour can wait for the next revision.'
			},
			{ type: 'heading', text: 'Keep your own record' },
			{
				type: 'paragraph',
				text: "Next to the buyer's guide, keep a private note for each batch: the bill of materials revision, the checks you ran before packing, and anything you did differently. You'll want it when the first support email arrives, and again when you start the next batch."
			},
			{ type: 'heading', text: 'Where it goes on Selfcrafted' },
			{
				type: 'paragraph',
				text: 'Every listing has room for documentation next to the description. Put the guide there as well as in the box, so it can still be found after the packaging is gone. The Korby Probe listing is an example.',
				links: [
					{
						label: 'Korby Probe listing',
						href: '/Korby_Probe/craft/item=67e3bf38-f9ca-4468-86a7-9e26e36c3e09'
					}
				]
			}
		]
	},
	{
		slug: 'a-useful-part-deserves-a-second-life',
		cover: {
			src: '/images/blog/parts-organiser.webp',
			alt: 'Line drawing of an open parts organiser holding screws, standoffs, a stepper motor, a heater cartridge, a fan, wire, switches and knobs.',
			width: 1400,
			height: 933,
			ogSrc: '/images/blog/parts-organiser-og.jpg',
			lineArt: true,
			credit: ILLUSTRATION_CREDIT
		},
		title: 'A useful part deserves a second life',
		excerpt:
			"How to list spares and leftover parts so the next person can trust what they're buying.",
		category: 'Guides',
		publishedAt: '2026-09-10',
		updatedAt: '2026-11-15',
		body: [
			{
				type: 'paragraph',
				text: 'Every workshop collects them. Switches left over after a redesign, motors from a prototype you abandoned, a display ordered in the wrong size. Too useful to throw away, and too poorly described for anyone else to use.'
			},
			{
				type: 'paragraph',
				text: 'Selfcrafted has two places for parts like these. Spares are replacement parts for a product, like the magnets and the PCB for the Korby Probe. The flea market is for surplus and used parts from your bench. In both, the description is what makes a part sellable.'
			},
			{ type: 'heading', text: 'Say exactly what it is' },
			{
				type: 'paragraph',
				text: "Write down what you can see and check: the manufacturer's marking or model number, how many you have, the main dimensions, and the connector or mounting. If it only fits certain things, say which. A bracket made for 2020 extrusion is useful to far fewer people than the photo suggests."
			},
			{ type: 'heading', text: "Say what state it's in" },
			{
				type: 'paragraph',
				text: 'There are three honest answers and they\'re different: unused surplus, removed from something that was working, or untested. Pick one and put it in the first line of the description. Untested is fine. People buy untested parts all the time, at a price that reflects it. What they won\'t forgive is "works perfectly" on a part you never powered up.'
			},
			{ type: 'heading', text: 'Photograph the actual part' },
			{
				type: 'paragraph',
				text: "Show the whole part, its markings, its connectors and any wear, with something in the frame for scale. If you have five, photograph the five. A catalogue image from the manufacturer's website shows the buyer what a new one looks like, and you aren't selling a new one."
			},
			{ type: 'heading', text: 'Pass on what you learned' },
			{
				type: 'paragraph',
				text: "Parts come with knowledge that never made it into a datasheet. The display needs an odd cutout. The knob clears one shaft and fouls another. The fan is louder than its rating suggests. Write it down, and keep what you measured separate from what you're guessing."
			},
			{
				type: 'list',
				items: [
					'Keep matching cables, screws and labels with the part.',
					'Say what project it came out of.',
					'Pack small parts so the markings stay readable.',
					'Update the stock count when you sell or use some.'
				]
			},
			{ type: 'heading', text: 'Listing it' },
			{
				type: 'paragraph',
				text: 'In the maker portal, add a listing and set its type to spare or flea market. Give it a price and a stock count, add your photos, and submit it. We look at each listing before it goes live.',
				links: [{ label: 'Apply as a maker', href: '/maker/apply' }]
			},
			{
				type: 'paragraph',
				text: "Not every leftover deserves a listing. If you can't say what a part is or what it fits, nobody else will be able to either. List the ones you can describe, while you still remember where they came from."
			}
		]
	}
];

function estimateReadingMinutes(post: Omit<BlogPost, 'readingMinutes'>): number {
	const wordCount = post.body.reduce((total, block) => {
		const text = block.type === 'list' ? block.items.join(' ') : block.text;
		return total + text.trim().split(/\s+/).length;
	}, 0);

	return Math.max(1, Math.ceil(wordCount / 200));
}

export const posts: BlogPost[] = postDrafts.map((post) => ({
	...post,
	readingMinutes: estimateReadingMinutes(post)
}));
