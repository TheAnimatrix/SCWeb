/* eslint-disable no-irregular-whitespace */
const origin: string = `* **Frustration with the Maker Ecosystem**: <br/>  Born out of frustration with the challenges in India's maker ecosystem, including import bans, high customs fees, and lack of local tooling options.

* **Impact on Individual Makers**: <br/>  Individual makers face difficulties due to these issues, affecting their ability to pursue their passion and contribute to innovation.

* **Addressing the Problem Head-On**: <br/>  Rather than accepting defeat, this project aims to tackle the challenges head-on, considering it a form of war against the constraints imposed on the maker community.  

* **Empowering Passionate Makers**: <br/>  The goal is to empower passionate makers by providing adequate support in designing, prototyping, sourcing, and developing low-cost indie electronics.  

* **Disrupting the Space**: <br/>  Focused initially on the electronics maker ecosystem, the project seeks to disrupt and make affordable tools crucial for a rapid revolution in the maker space.  

* **Examples of Targeted Products**: <br/>  Specific products include 3D printing boards, probes, designs, low-cost adjustable current and voltage power supplies, remote sensing systems, and more.  

* **Inclusive Community Building**: <br/>  Welcoming individuals who share the vision to join the cause, with a presence on Discord for collaboration and discussion.  

* **Encouraging interested individuals to explore the "Start Crafting" page for more details and engagement opportunities.**
`;

const risks: string = 
`At the core of our platform, sellers come in two distinct types: **_Selfcrafted Approved_** and **_Selfcrafted Fulfilled_**.  
  
**Selfcrafted Fulfiled**  
Simply put, Selfcrafted Fulfilled is our sophisticated way of assuring you that we take care of every aspect related to the product, even after it lands in your hands.
This includes handling warranties and guarantees applicable to your purchase.
If you've already placed your trust in us, rest assured that this won't require any additional effort on your part.  
   
**Selfcrafted Approved**  
Now, let's delve into Selfcrafted Approved. 
While it's true that these products may not be production level, we've got your back on a case-by-case basis if the seller falls short. We guarantee that you will receive the product no matter what,
and it's only the performance that's ever at stake if at all. Should any issues arise, we're here to assist you. Moreover, sellers bear consequences if the product doesn't function as intended.
Your satisfaction and peace of mind are our top priorities throughout your entire experience.`;

const roadmap : string =
`
1. [ ] <span class="text-sccyan">Website Launch</span> _TBD_  
Shipped preliminary e-commerce front-end to kickstart the Selfcrafted Project  

2. [x] gtas
-----
`;

interface ABOUTSTR {
    origin : string;
    roadmap : string;
    risks : string;
};

export const ABOUT_STRINGS : ABOUTSTR = {origin,risks,roadmap};