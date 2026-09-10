import type { BlogPost } from './types';

export type { BlogBlock, BlogCategory, BlogPost } from './types';
export { formatPostDate } from './types';

const postDrafts: Omit<BlogPost, 'readingMinutes'>[] = [
	{
		slug: 'why-india-needs-selfcrafted',
		cover: {
			src: '/images/blog/a-home-for-indie-hardware.webp',
			alt: 'Ink illustration of makers gathered around a table of small hardware projects.',
			width: 1400,
			height: 933,
			caption: 'A small community can still be exactly the right audience.'
		},
		title: "India needs a home for the hardware that isn't for everyone.",
		excerpt:
			'A seller account is useful. A place to find your people, figure out what to build, and keep improving it is a different thing.',
		category: 'Perspectives',
		publishedAt: '2026-09-10',
		body: [
			{
				type: 'paragraph',
				text: 'You build a thing. It solves a weirdly specific problem. You show it to a few people and one of them goes, “Wait, I need that.” Then you hit the awkward bit: where does this thing actually belong?'
			},
			{
				type: 'paragraph',
				text: "Maybe it's a little desk device. A controller for one particular hobby. A better enclosure for a board people already use. It doesn't need to become the next big consumer brand to be worth making. It needs to reach the people who get it. That's the bit we want Selfcrafted to care about, here in India."
			},
			{ type: 'heading', text: '“Why not just sell on Amazon?”' },
			{
				type: 'paragraph',
				text: "Fair question. Amazon has a seller registration route, and Robu has a seller enquiry form. Those doors exist. We're not pretending otherwise. If you've got a finished product and need somewhere to sell it, they're routes you can look into.",
				links: [
					{ label: 'Amazon India seller information', href: 'https://sell.amazon.in/sell-online' },
					{ label: 'Robu seller form', href: 'https://robu.in/seller-form/' }
				]
			},
			{
				type: 'paragraph',
				text: "Our experience with Lornode was a bit less encouraging. We reached out to Robu about getting onboarded and got no response. I wondered whether their own products were part of the reason, but I couldn't verify that. The experience I can actually speak to is the unanswered outreach."
			},
			{
				type: 'paragraph',
				text: "That's just our experience. It did make a very practical question harder to shake, though: why should an independent product's next step depend so much on whether someone else's catalogue has room for it?"
			},
			{
				type: 'paragraph',
				text: "Even a successful listing leaves another question open. What if you're still working out the product? Who wants the smaller version? Is that extra feature useful, or just something you enjoyed adding? Who will try the awkward first revision and tell you what needs fixing? A place to sell the answer isn't automatically a place to work out the question."
			},
			{ type: 'heading', text: 'Niche is an audience, not a unit count' },
			{
				type: 'paragraph',
				text: "Imagine a graph. One axis is how broad the audience is. The other is how many units they need. People tend to squash those into the same thing: small audience, small opportunity. But they don't always travel together."
			},
			{
				type: 'paragraph',
				text: 'A small hobby community might want a handful of a very particular accessory. A narrow type of business might need that same kind of specialised object over and over. Both audiences are niche. One needs a small batch; the other could need a much bigger one. Neither has to appeal to absolutely everyone.'
			},
			{
				type: 'quote',
				text: 'A small audience can still have a very real need. The batch size is a separate conversation.'
			},
			{
				type: 'paragraph',
				text: "That's the part of the graph we're interested in. Consumer and hobbyist hardware with a clear reason to exist, whether the right quantity is modest or surprisingly large. We don't want a project to have to cosplay as a mass-market startup just to be taken seriously."
			},
			{ type: 'heading', text: 'Make the figuring-it-out part fun' },
			{
				type: 'paragraph',
				text: "This is where the gamification idea comes in. We'd like product research and development to feel like something people can join. You discover a project, react to an early direction, help the maker understand a problem, and get to see what changed because people cared enough to contribute."
			},
			{
				type: 'paragraph',
				text: "Think visible progress, useful little milestones, and reasons to come back as an idea gets better. The interesting achievement is a better product, or a clearer understanding of what people need. A pile of clicks with nothing learned doesn't do much for anyone. We're still figuring out how to make that participation feel rewarding without turning it into noise."
			},
			{
				type: 'paragraph',
				text: "And the consumer belongs in that process. You shouldn't need to design a circuit board to say, “This would be perfect if I could use it one-handed.” Hobbyists, buyers and makers notice different things. Getting them into the same conversation, while changes are still possible, is the whole point."
			},
			{ type: 'heading', text: 'Why we keep coming back to a platform of our own' },
			{
				type: 'paragraph',
				text: 'Sure, you can stitch together a shop, a chat group, a feedback form and a long trail of DMs. People make that work. But somebody has to keep carrying the context between all those places. The customer sees a listing. The maker sees a dozen scattered requests. The story of how the thing got better gets lost somewhere in the middle.'
			},
			{
				type: 'paragraph',
				text: "For what we're trying to do, adding another seller account doesn't really solve it. We want discovery, development and the eventual product to stay connected. We want a maker in India to have somewhere to start before the product looks like an obvious retail bet, and somewhere to stay if the audience remains small and specific."
			},
			{
				type: 'paragraph',
				text: "That's the case for Selfcrafted. It's an attempt, not a victory lap. We still have to earn the attention of the people we want to serve, and the more playful R&D experience is a direction we're working towards. But the thing we're building around is pretty simple: if something is really useful to the right people, it deserves a fair shot at existing."
			}
		]
	},
	{
		slug: 'a-product-studio-for-the-ai-era',
		cover: {
			src: '/images/blog/product-studio-ai-era.webp',
			alt: 'A maker considers a digital design alongside sketches and a physical prototype.',
			width: 1400,
			height: 933,
			caption: 'Somewhere between the first sketch and the thing you can hold.'
		},
		title: "So, about that product studio we're thinking of building.",
		excerpt:
			"AI can make an idea look real very quickly. We're exploring what it takes to help someone actually make the thing.",
		category: 'Perspectives',
		publishedAt: '2026-09-10',
		body: [
			{
				type: 'paragraph',
				text: 'You can spend an evening playing with an idea and come away with a name, a page and a rather convincing picture of the product. Lovely. Now put the actual thing on the desk. That next step is where the conversation gets interesting.'
			},
			{
				type: 'paragraph',
				text: "It's also why we're thinking about a product studio inside Selfcrafted. Right now, in September 2026, this is a concept we're actively exploring. There isn't a finished studio hiding behind a launch button, and this post isn't a promise that every feature is about to ship. It's a look at the problem that's been occupying us."
			},
			{ type: 'heading', text: 'The picture is the easy bit to fall in love with' },
			{
				type: 'paragraph',
				text: "A nice product image makes it very easy to skip ahead in your head. You can almost feel the object. You already know where you'd put it. Then someone asks how it goes together, whether the parts fit, or who is actually going to make it. Suddenly the picture has a lot less to say."
			},
			{
				type: 'paragraph',
				text: 'AI is opening up a fun space for exploring shapes, ideas and alternatives. We want to use that. But physical products eventually have to deal with physical reality, and somebody has to take responsibility for the decisions between the exciting image and the thing you receive. That gap is what a product studio ought to help with.'
			},
			{ type: 'heading', text: 'Somewhere to work on your thing' },
			{
				type: 'paragraph',
				text: 'The broad idea is an approachable place to describe a product, explore what it could look like, change your mind a few times, and make progress towards something buildable. Maybe you start with a problem. Maybe you already have a bit of hardware and want to turn it into an object someone would actually enjoy using.'
			},
			{
				type: 'paragraph',
				text: 'Say you want a little desk device that shows the information you keep checking on your phone. You should be able to explore that idea without first becoming the person who knows every tool, every supplier and every question to ask. You still need decisions and judgement. The studio should help you reach those decisions with a lot less aimless running around.'
			},
			{
				type: 'quote',
				text: 'The useful part starts when an idea can survive a conversation with the person who has to make it.'
			},
			{
				type: 'paragraph',
				text: "We want that exploration to stay playful. Try a different shape. Realise the original one was better. Discover a simpler way to get the result you wanted. There's value in having somewhere to do that, even if you never intend to launch a company around the outcome."
			},
			{ type: 'heading', text: 'Useful before the crowd arrives' },
			{
				type: 'paragraph',
				text: 'A marketplace has an awkward early question: why should a buyer show up before there are enough makers, and why should a maker show up before there are enough buyers? A studio gives us another place to begin. One person, one idea, one useful session. There can be a reason to open Selfcrafted even before a crowd is waiting for the result.'
			},
			{
				type: 'paragraph',
				text: "That's an important shift in what we're thinking about. Help somebody make progress first. If that progress turns into a product other people want, there's a natural reason for the marketplace and the community to be there. The creation process can give the rest of the platform something real to gather around."
			},
			{ type: 'heading', text: 'The people making it still matter' },
			{
				type: 'paragraph',
				text: "The direction we're exploring includes a path from the studio to approved makers who can review a proposed build and help turn it into a physical object. That human step matters. An attractive concept and an agreed, makeable product are different stages of the work. We want the experience to make that difference understandable."
			},
			{
				type: 'paragraph',
				text: "We're also interested in what happens when an idea finds its small crowd. Maybe a few people want the same thing and can get behind a batch together. That's a possibility we're exploring, not an ordering programme we're announcing today. The details need to make sense for the person buying and the person doing the making."
			},
			{ type: 'heading', text: "We're keeping the machinery off this page" },
			{
				type: 'paragraph',
				text: "There are plenty of technical questions behind this, and we're deliberately not getting into them here. The same goes for pricing, exact launch scope and the finer points of how orders would work. Those are still being worked through. We'd rather share the direction clearly than dress an unfinished decision up as a feature."
			},
			{
				type: 'paragraph',
				text: "What we're comfortable saying is this: as AI makes it easier to explore an idea, helping someone choose well and get something useful made becomes more interesting. A product studio should give that enthusiasm somewhere practical to go. Less time wondering which disconnected step comes next; more time working on the thing itself."
			},
			{
				type: 'paragraph',
				text: "So that's what we're conceptualising at Selfcrafted at the moment. A place where a consumer, a hobbyist or a maker can start with “wouldn't it be nice if…” and have a better chance of ending up with something they can hold. We have a lot to figure out. It feels like a worthwhile thing to figure out."
			}
		]
	},
	{
		slug: 'the-best-hardware-starts-with-a-small-stubborn-problem',
		cover: {
			src: '/images/blog/small-stubborn-problem.webp',
			alt: 'A hand adjusts a simple metal bracket on a wooden workbench.',
			width: 1400,
			height: 933
		},
		title: 'The best hardware starts with a small, stubborn problem.',
		excerpt: 'A useful product often begins with one ordinary frustration that refuses to go away.',
		category: 'Perspectives',
		publishedAt: '2026-09-10',
		body: [
			{
				type: 'paragraph',
				text: 'Hardware ideas are often introduced at their largest scale: a platform, an ecosystem, a new category. The work usually begins somewhere much smaller. A connector is awkward to reach. A tool has nowhere sensible to sit. A common enclosure almost fits, but wastes the space that matters. The problem is modest enough to ignore and persistent enough that somebody eventually decides not to.'
			},
			{
				type: 'paragraph',
				text: 'That small beginning is useful because it gives the maker a sharp test. The object either improves a real moment or it does not. There is less room for a vague promise when a prototype must fit a hand, a desk, or another part. The physical world keeps the brief honest.'
			},
			{ type: 'heading', text: 'Stay close to the irritation' },
			{
				type: 'paragraph',
				text: 'Before choosing features, describe the troublesome moment precisely. What is someone trying to do? What interrupts them? What workaround have they already invented? A taped-on spacer or hand-labelled switch is not an embarrassment. It is evidence that the need has survived contact with daily life.'
			},
			{
				type: 'quote',
				text: 'A narrow problem gives each design decision somewhere solid to stand.'
			},
			{
				type: 'paragraph',
				text: 'A clear problem also helps with restraint. If a display, wireless connection, or companion app does not improve that moment, it can wait. Every addition asks for space, power, assembly time, documentation, and support. A simple object can still be ambitious; its ambition is to remove friction reliably.'
			},
			{ type: 'heading', text: 'Build the smallest complete answer' },
			{
				type: 'paragraph',
				text: 'The first useful version should form a complete loop. A mount should mount securely and release when expected. A controller should make its essential state legible. A small instrument should produce a result that its user can understand. “Complete” does not mean polished or final. It means the central promise can be tested without explaining away missing pieces.'
			},
			{
				type: 'list',
				items: [
					'Name the one action the object must make easier.',
					'List the constraints the physical setting imposes.',
					'Remove any feature that cannot yet justify its cost and complexity.',
					'Put the result in the place where the problem actually happens.'
				]
			},
			{
				type: 'paragraph',
				text: 'Once the core works, the surrounding product becomes easier to see. Repeated use reveals which edge needs softening, which label is unclear, and which step belongs in the instructions. Those details are discovered through attention, not guessed in a feature list.'
			},
			{ type: 'heading', text: 'Let usefulness set the scale' },
			{
				type: 'paragraph',
				text: 'Some stubborn problems belong to a small group, and that can be enough. Indie hardware does not need to imitate the scale of mass-market electronics to matter. A carefully made part can serve a particular workflow, repair a familiar annoyance, or keep another object in use. Its value comes from the quality of the fit between problem and answer.'
			},
			{
				type: 'paragraph',
				text: 'The maker can always widen the view later. Variants, accessories, and new uses may emerge. Starting narrow simply means the first claim is one you can inspect, build, and improve. Find the small problem that keeps asking for attention. Give it a direct answer. That is enough ground for good hardware to begin.'
			}
		]
	},
	{
		slug: 'what-to-document-before-you-ship-your-first-build',
		cover: {
			src: '/images/blog/document-your-build.webp',
			alt: 'An open notebook of assembly sketches sits beside a device and its neatly arranged parts.',
			width: 1400,
			height: 933
		},
		title: 'What to document before you ship your first build.',
		excerpt:
			'Good documentation preserves the decisions behind a build and gives its next owner a confident start.',
		category: 'Guides',
		publishedAt: '2026-09-08',
		body: [
			{
				type: 'paragraph',
				text: 'The final assembly is still on the bench, so every detail feels obvious. You know which cable goes where, how firmly the case closes, and what the status light means during startup. The person opening the box knows none of this. Documentation is the bridge between those two points of view.'
			},
			{
				type: 'paragraph',
				text: 'Writing it before shipping does more than help the recipient. It exposes unfinished parts of the product. If the setup needs a long explanation, the interface may need another pass. If two revisions look identical but behave differently, the revision needs a visible identity. Documentation is part of the build because it tests whether the object can leave its maker.'
			},
			{ type: 'heading', text: 'Record what this unit is' },
			{
				type: 'paragraph',
				text: 'Begin with identity. Give the product a stable name and the build a revision. Record the date assembled and the firmware or configuration version when relevant. If a future replacement part must match a dimension or connector, write that down too. The aim is not to publish the whole workshop notebook. It is to make this physical unit understandable six months from now.'
			},
			{
				type: 'list',
				items: [
					'Product name, hardware revision, and unit identifier.',
					'What is included in the package and what the user must provide.',
					'Compatible accessories, software, and ordinary operating requirements.',
					'A dated record of any variation specific to this build.'
				]
			},
			{ type: 'heading', text: 'Walk through the first ten minutes' },
			{
				type: 'paragraph',
				text: 'Write setup instructions while following them with a reset device and a cleared workspace. Start at the unopened package. Describe connections in the order they should happen, using the same names that appear on the object. Say what successful startup looks like. A useful instruction pairs an action with an observable result: connect this, then expect that.'
			},
			{
				type: 'quote',
				text: 'The first-run guide should replace the maker standing beside the product.'
			},
			{
				type: 'paragraph',
				text: 'Include the normal controls and states after setup. Label diagrams sparingly and make them match the shipped revision. Photographs can help with orientation, but a sentence should still explain why the pictured detail matters. Keep optional tuning separate from the shortest path to a useful result.'
			},
			{ type: 'heading', text: 'Make recovery ordinary' },
			{
				type: 'paragraph',
				text: 'A product feels more dependable when common confusion has a calm answer. Document how to restart, return to a known state, and distinguish a normal wait from a problem. List a few symptoms in the language a user would use, followed by simple checks. Avoid turning the guide into an exhaustive fault tree; give people a sensible next step and a clear route to support.'
			},
			{
				type: 'paragraph',
				text: 'Also say how to care for, store, and clean the object where that affects ordinary use. Identify parts intended to be replaced and how someone can request them. If the enclosure can be opened for planned maintenance, explain the boundary of that task without encouraging risky improvisation.'
			},
			{ type: 'heading', text: 'Preserve the maker record' },
			{
				type: 'paragraph',
				text: 'Keep a private build record alongside the customer-facing guide. Note the bill of materials revision, assembly checks, and final functional check. Record departures from the standard build. This is the trail you will need when feedback arrives or the next batch begins.'
			},
			{
				type: 'paragraph',
				text: 'Finally, read every document as the owner rather than the inventor. Remove workshop shorthand. Check every link and filename. Put the essential guide where it can be found after the packaging is gone. Shipping the object transfers possession; good documentation transfers enough knowledge for the object to become useful.'
			}
		]
	},
	{
		slug: 'a-useful-part-deserves-a-second-life',
		cover: {
			src: '/images/blog/second-life-parts.webp',
			alt: 'Hands sort spare knobs, brackets, circuit boards and enclosures for reuse.',
			width: 1400,
			height: 933
		},
		title: 'A useful part deserves a second life.',
		excerpt:
			'Spare parts become valuable again when their condition, context, and potential are made legible.',
		category: 'Field notes',
		publishedAt: '2026-09-05',
		body: [
			{
				type: 'paragraph',
				text: 'A workshop slowly gathers a quiet inventory. There are switches left after a redesign, motors from an abandoned prototype, displays ordered in the wrong size, and perfectly good fasteners that no longer belong to an active build. Each part is too useful to discard and too poorly described to use.'
			},
			{
				type: 'paragraph',
				text: 'The obstacle is rarely the part alone. It is missing context. Without a clear identity, condition, and reason to trust it, a component becomes a question someone else must spend time answering. Giving a part a second life starts by reducing that uncertainty.'
			},
			{ type: 'heading', text: 'Make the part legible' },
			{
				type: 'paragraph',
				text: 'Begin with what can be observed and verified. Record the manufacturer marking or exact model when available, the quantity, major dimensions, and connector or mounting details. Say whether it is unused surplus, removed from a working assembly, or untested. These are different conditions, and plain language serves the next maker better than an optimistic label.'
			},
			{
				type: 'quote',
				text: 'A spare becomes useful when another maker can understand it without inheriting your guesswork.'
			},
			{
				type: 'paragraph',
				text: 'A few deliberate photographs can carry much of the remaining context. Show the whole part, its markings, its connectors, and any wear. Include a sense of scale. If there are several units, show the actual group rather than a representative catalogue image. The goal is not glamour; it is a confident decision.'
			},
			{ type: 'heading', text: 'Preserve the small pieces of knowledge' },
			{
				type: 'paragraph',
				text: 'Parts often arrive with knowledge that never made it into a formal specification. A bracket was made to fit a common extrusion. A display needs an unusual cutout. A knob clears one shaft but not another. Write down what you learned while using it, while keeping observation separate from assumption.'
			},
			{
				type: 'list',
				items: [
					'Keep labels, matching cables, and known accessories with the part.',
					'Add a short note about the project and environment it came from.',
					'Package small items so markings and delicate features stay readable.',
					'Update the record if you test, divide, or reserve the quantity.'
				]
			},
			{ type: 'heading', text: 'Design with recovery in mind' },
			{
				type: 'paragraph',
				text: 'Second lives are easier when the original product allows parts to leave gracefully. Standard fasteners, accessible assemblies, replaceable wear parts, and visible revision marks all help. So does keeping a modest service record. These choices support repair today and make components easier to recover when the larger object eventually changes purpose.'
			},
			{
				type: 'paragraph',
				text: 'This does not mean every fragment must be saved indefinitely. Sorting is an act of judgment. Some parts lack a sensible path back to use, and clutter can hide the good material. Set a clear space for surplus, review it periodically, and describe promising items while their history is still fresh.'
			},
			{
				type: 'paragraph',
				text: 'A component moving from one bench to another is a small form of continuity. It shortens someone’s search and lets existing material answer a new problem. The practical work is simple: identify it, tell the truth about it, preserve what you know, and make the handoff easy.'
			}
		]
	},
	{
		slug: 'from-prototype-to-something-people-can-use',
		cover: {
			src: '/images/blog/prototype-to-product.webp',
			alt: 'Three versions of a desk light, from a cardboard model to a working prototype and a finished object.',
			width: 1400,
			height: 933
		},
		title: 'From prototype to something people can use.',
		excerpt:
			'The distance from a working demo to a usable product is filled with small, consequential decisions.',
		category: 'Guides',
		publishedAt: '2026-09-02',
		body: [
			{
				type: 'paragraph',
				text: 'A prototype answers an exciting question: can this idea work? A product must answer a slower set of questions. Can someone recognize what to do? Can the maker build it again? Can it travel, be set up, and return to a useful state after something unexpected happens? The proof on the bench is the beginning of that work.'
			},
			{
				type: 'paragraph',
				text: 'This transition can feel less creative because progress arrives through details. A cable receives strain relief. A confusing button gets a better label. A temporary spacer becomes a repeatable part. Yet these decisions are where the invention becomes available to another person.'
			},
			{ type: 'heading', text: 'Define the promise before refining the object' },
			{
				type: 'paragraph',
				text: 'Write one sentence describing what the finished build helps someone accomplish. Then define the conditions around that promise: where it is used, what it connects to, what the user already knows, and what they must provide. This boundary prevents polish from spreading into parts of the concept that are not ready to become product.'
			},
			{
				type: 'quote',
				text: 'A product is a repeatable experience built around a working idea.'
			},
			{
				type: 'paragraph',
				text: 'Choose a small set of success conditions from that promise. The essential operation should be reliable. Setup should have a clear path. The main states should be visible. The build should tolerate ordinary handling in its intended setting. Specific conditions give each revision a purpose and make “done” less dependent on mood.'
			},
			{ type: 'heading', text: 'Replace memory with repeatability' },
			{
				type: 'paragraph',
				text: 'The prototype contains invisible knowledge: the order you tighten parts, the wire that must bend a certain way, the configuration you changed once and forgot. Build a second unit from written notes. Wherever the second build stalls, the process is still living in your hands rather than in the product.'
			},
			{
				type: 'list',
				items: [
					'Freeze a revision before changing parts, files, or assembly steps.',
					'Name components consistently across the bill of materials and instructions.',
					'Record simple checks at stages where mistakes become hidden later.',
					'Keep acceptable variations explicit instead of correcting them from memory.'
				]
			},
			{
				type: 'paragraph',
				text: 'Repeatability also changes sourcing decisions. A convenient one-off part may be awkward to replace. A beautiful finish may vary too much between builds. The right choice is not always the most standardized one, but its tradeoff should be visible before a batch depends on it.'
			},
			{ type: 'heading', text: 'Watch someone meet it' },
			{
				type: 'paragraph',
				text: 'Give a representative build and its draft instructions to someone who has not watched it develop. Ask them to narrate what they expect, then resist guiding each step. Their pauses reveal missing cues. Their interpretation of a label matters more than the meaning you intended. Observe the product and instructions as one system.'
			},
			{
				type: 'paragraph',
				text: 'Sort what you learn by consequence. Address anything that prevents the main task, creates an easy-to-make assembly error, or leaves the user unable to recover. Cosmetic preferences can inform later revisions. Trying to absorb every suggestion at once makes the product less coherent and delays the next useful test.'
			},
			{ type: 'heading', text: 'Prepare the handoff' },
			{
				type: 'paragraph',
				text: 'Before release, assemble the exact package: product, accessories, setup guide, revision identity, and support route. Follow the customer path from opening it to completing the central task. Then store the files and records needed to make or understand that revision again.'
			},
			{
				type: 'paragraph',
				text: 'There is no point where a physical product stops changing forever. Shipping creates a stable reference, not a final answer. Make that reference coherent, document what it is, and let real use provide the next set of questions. The prototype proved the mechanism. The product earns trust by making its value repeatable.'
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
