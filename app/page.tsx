'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const companies = ['Stripe','Shopify','HubSpot','Notion','Intercom','Figma','Linear','Vercel'];

const testimonials = [
  {
    quote: "We've tested a lot of sequencers & ultimately LeadGenie has been the most helpful in generating revenue for our clients. It has all the functionality any advanced cold email initiative needs, while still being easy to use.",
    name: 'Mike Ellis', role: 'Co-Founder, Kale Acquisition', company: 'Kale', initials: 'ME',
  },
  {
    quote: "LeadGenie became the backbone of our outreach — over 100,000 emails sent across 20+ domains with 20%+ reply rates and a steady stream of qualified leads. It's not just a sending tool, it's our growth engine.",
    name: 'Briken Bufi', role: 'CEO & Co-Founder, Aella Creative Force', company: 'AELLA', initials: 'BB',
  },
  {
    quote: "LeadGenie nails what others get wrong — it's actually intuitive to use. The integrations are seamless, the UX doesn't make you want to pull your hair out.",
    name: 'Alex Baldovin', role: 'CEO, Authbound', company: 'Authbound', initials: 'AB',
  },
];

export default function HomePage() {
  const [idx, setIdx] = useState(0);
  const visible = [testimonials[idx % 3], testimonials[(idx+1) % 3]];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO  –  white bg, dark text (like Instantly)
      ══════════════════════════════════════════ */}
      <section className="hero-section">
        <div className="container relative z-10 pt-20 pb-0 text-center">

          {/* Badge */}
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:.45}}
            className="mb-6 flex justify-center">
            <Link href="/signup"
              className="inline-flex items-center gap-2 border border-gray-200 rounded-full px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors bg-white card-shadow">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"/>
              AI Reply Agent is now live — try it free
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.6}}
            className="text-5xl sm:text-6xl lg:text-[76px] font-extrabold text-gray-900 leading-[1.06] tracking-[-0.02em]">
            Find &amp; Close Clients<br/>
            <span className="gradient-text">On Autopilot</span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.1}}
            className="mt-5 text-lg text-gray-500 max-w-[520px] mx-auto leading-relaxed">
            LeadGenie finds your ideal prospects, writes personalised outreach, and books meetings — while you focus on closing.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.55,delay:.2}}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full px-7 py-3.5 transition-colors card-shadow-lg">
              Start For Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 font-semibold text-sm rounded-full px-7 py-3.5 transition-colors hover:bg-gray-50">
              Sign In
            </Link>
          </motion.div>

          {/* Social proof stars */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.32}}
            className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_,i)=>(
                <svg key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <span><strong className="text-gray-900">4.9/5</strong> from 2,400+ reviews</span>
            <span className="hidden sm:block text-gray-300">·</span>
            <span>No credit card required</span>
          </motion.div>

          {/* Product mockup */}
          <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:.8,delay:.4}}
            className="mt-14 relative mx-auto max-w-[960px]">
            <div className="mockup-glow rounded-2xl overflow-hidden border border-gray-200">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]"/>
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]"/>
                  <span className="h-3 w-3 rounded-full bg-[#28c840]"/>
                </div>
                <div className="flex-1 max-w-[280px] mx-auto bg-white border border-gray-200 rounded-md px-3 py-1 flex items-center gap-2">
                  <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <span className="text-xs text-gray-400">app.leadgenie.io</span>
                </div>
              </div>

              {/* App shell */}
              <div className="flex bg-white" style={{minHeight:340}}>
                {/* Sidebar */}
                <aside className="w-[200px] border-r border-gray-100 bg-gray-50 p-3 hidden sm:flex flex-col gap-0.5 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-2 mb-3">
                    <span className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">⚡</span>
                    <span className="text-sm font-bold text-gray-900">LeadGenie</span>
                  </div>
                  {[{icon:'📊',label:'Dashboard',a:true},{icon:'📧',label:'Campaigns'},{icon:'👥',label:'Leads'},{icon:'🤖',label:'AI Agents',new:true},{icon:'📥',label:'Inbox'},{icon:'⚙️',label:'Automations'}].map(item=>(
                    <div key={item.label}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-default ${item.a?'bg-blue-600 text-white':'text-gray-600 hover:bg-gray-100'}`}>
                      <span>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.new&&<span className="text-[9px] font-bold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5">NEW</span>}
                    </div>
                  ))}
                </aside>

                {/* Main */}
                <div className="flex-1 p-5 overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Dashboard</h2>
                      <p className="text-xs text-gray-400">Welcome back, Alex</p>
                    </div>
                    <button className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5">
                      <span>+</span> New Campaign
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[{l:'Emails Sent',v:'48,290',c:'+12%',up:true},{l:'Reply Rate',v:'18.4%',c:'+2.1%',up:true},{l:'Leads',v:'3,812',c:'+820',up:true},{l:'Meetings',v:'47',c:'+8',up:true}].map(s=>(
                      <div key={s.l} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 mb-1">{s.l}</p>
                        <p className="text-base font-bold text-gray-900">{s.v}</p>
                        <p className="text-[10px] text-green-600 font-semibold">{s.c}</p>
                      </div>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-700">Campaigns</span>
                      <span className="text-[10px] text-blue-600 font-medium">View all →</span>
                    </div>
                    {[{n:'SaaS Founders Outreach',s:'Active',r:'11.0%'},{n:'E-commerce DMs',s:'Active',r:'19.3%'},{n:'B2B Tech CTOs',s:'Active',r:'20.0%'}].map(r=>(
                      <div key={r.n} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <span className="text-xs text-gray-700">{r.n}</span>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500"/>{r.s}
                          </span>
                          <span className="text-xs font-bold text-blue-600">{r.r}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Company logos strip */}
        <div className="container pb-20 pt-12 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-7">
            Trusted by teams at world-class companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {companies.map(co=>(
              <span key={co} className="text-sm font-bold text-gray-300 hover:text-gray-500 transition-colors cursor-default tracking-wide">
                {co}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section className="border-y border-gray-100 py-12 bg-white">
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[{v:'30,000+',l:'Companies'},{v:'500M+',l:'Emails Sent'},{v:'18%',l:'Avg Reply Rate'},{v:'4.9/5',l:'G2 Rating'}].map(s=>(
              <div key={s.l}>
                <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{s.v}</p>
                <p className="mt-1.5 text-sm text-gray-500 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURE 1 – Find Leads
      ══════════════════════════════════════════ */}
      <FeatureSection
        label="Lead Generation"
        title="Find Your Perfect Leads Instantly"
        desc="Search a database of 160M+ verified contacts. Filter by job title, company size, industry, location, and more — then export directly into your campaigns."
        bullets={['160M+ verified B2B contacts','Real-time email verification','Filter by 50+ data points','1-click export to campaigns']}
        cta={{ label:'Start Finding Leads', href:'/signup' }}
        bg="white"
        visual={
          <div className="bg-white rounded-2xl border border-gray-200 p-5 card-shadow-lg">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Leads Finder</p>
            <div className="space-y-2 mb-5">
              {['By Job Title','By Company Size','By Industry','By Location','By Technology'].map(f=>(
                <div key={f} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                  <span className="h-4 w-4 rounded-full border-2 border-blue-400 bg-blue-100 shrink-0"/>
                  <span className="text-sm text-gray-700 font-medium">{f}</span>
                  <svg className="ml-auto w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              ))}
            </div>
            <button className="w-full bg-blue-600 text-white text-sm font-semibold rounded-xl py-3 hover:bg-blue-700 transition-colors">
              Search Leads →
            </button>
          </div>
        }
      />

      {/* ══════════════════════════════════════════
          FEATURE 2 – Write Emails  (gray bg, image left)
      ══════════════════════════════════════════ */}
      <FeatureSection
        label="AI Outreach"
        title="Write Emails That Actually Get Replies"
        desc="Our AI analyses every prospect and writes hyper-personalised emails that sound human. Set your tone, length, and style — then let AI do the writing at any scale."
        bullets={['AI-powered personalisation at scale','Multi-step sequences with auto follow-ups','A/B test subject lines automatically','Smart send-time optimisation']}
        cta={{ label:'Start Writing with AI', href:'/signup' }}
        bg="gray"
        flip
        visual={
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-shadow-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">AI Email Composer</span>
              <span className="ml-auto text-[11px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">AI Active</span>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">To</p>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="h-6 w-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">JD</span>
                  <span className="text-sm text-gray-700">John Doe · VP Sales, Acme Corp</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">Subject</p>
                <div className="border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm text-gray-800">
                  Quick question about Acme&apos;s outreach stack
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5 font-medium">Body</p>
                <div className="border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-700 leading-relaxed bg-gray-50 min-h-[80px]">
                  Hi John, I noticed Acme Corp recently expanded into enterprise — congrats! I&apos;d love to show you how LeadGenie helped similar VP Sales teams cut prospecting time by 70%...
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button className="flex-1 bg-blue-600 text-white text-xs font-semibold rounded-lg py-2.5 hover:bg-blue-700 transition-colors">Send Campaign</button>
                <button className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors">Regenerate ✨</button>
              </div>
            </div>
          </div>
        }
      />

      {/* ══════════════════════════════════════════
          FEATURE 3 – Email Warmup
      ══════════════════════════════════════════ */}
      <FeatureSection
        label="Deliverability"
        title="Land in the Inbox, Not Spam"
        desc="LeadGenie's warmup network automatically improves your sender reputation 24/7. Monitor your inbox placement score and catch issues before they hurt your campaigns."
        bullets={['Automatic email warmup runs in background','Real-time inbox placement monitoring','Custom DMARC, DKIM & SPF guidance','Reputation score dashboard']}
        cta={{ label:'Improve Deliverability', href:'/signup' }}
        bg="white"
        visual={
          <div className="bg-white rounded-2xl border border-gray-200 p-5 card-shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-bold text-gray-900">Warmup Dashboard</p>
              <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"/>Active
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[{l:'Inbox Rate',v:'97.3%',c:'green'},{l:'Spam Rate',v:'0.4%',c:'red'},{l:'Health',v:'98/100',c:'blue'}].map(s=>(
                <div key={s.l} className="text-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className={`text-lg font-extrabold ${s.c==='green'?'text-green-600':s.c==='red'?'text-red-500':'text-blue-600'}`}>{s.v}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="h-20 flex items-end gap-1">
              {[60,70,65,80,75,85,82,90,88,94,92,97].map((h,i)=>(
                <div key={i} className="flex-1 rounded-t-sm" style={{height:`${h}%`,background:`rgba(59,130,246,${0.25+i*0.06})`}}/>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-1">Last 30 days</p>
          </div>
        }
      />

      {/* ══════════════════════════════════════════
          FEATURE 4 – Analytics  (gray bg, flipped)
      ══════════════════════════════════════════ */}
      <FeatureSection
        label="Revenue Intelligence"
        title="Turn Metrics Into Revenue"
        desc="Go beyond opens and clicks. Track Opportunities, Pipeline, Conversions, and Revenue for every campaign. Automatically pause what's not working and scale what is."
        bullets={['Pipeline & revenue attribution','Auto-pause underperforming campaigns','Real-time reply & booking tracking','CRM sync with HubSpot & Salesforce']}
        cta={{ label:'See Analytics', href:'/signup' }}
        bg="gray"
        flip
        visual={
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-shadow-lg">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Campaign Results</p>
                <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"/>Live
              </span>
            </div>
            <div className="p-5">
              <div className="h-36 flex items-end gap-1.5 mb-5">
                {[40,55,45,65,58,72,68,80,74,88,82,96].map((h,i)=>(
                  <div key={i} className="flex-1 rounded-t-md transition-all"
                    style={{height:`${h}%`,background:`rgba(59,130,246,${0.2+i*0.065})`}}/>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[{l:'Sent',v:'122k'},{l:'Opened',v:'31.2%'},{l:'Replied',v:'18.4%'},{l:'Meetings',v:'284'}].map(s=>(
                  <div key={s.l} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                    <p className="text-base font-extrabold text-gray-900">{s.v}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      />

      {/* ══════════════════════════════════════════
          INTEGRATIONS
      ══════════════════════════════════════════ */}
      <section className="section-indigo py-24">
        <div className="container text-center">
          <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.3}} transition={{duration:.6}}>
            <span className="inline-block text-xs font-bold text-indigo-200 bg-white/10 rounded-full px-3 py-1 mb-5 uppercase tracking-widest">
              Integrations
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Connects With Every Tool<br/>You Already Use
            </h2>
            <p className="mt-4 text-indigo-200 text-base sm:text-lg max-w-xl mx-auto">
              Native integrations with your favourite CRMs, diallers, and automation tools — no Zapier needed.
            </p>
          </motion.div>

          <motion.div initial={{opacity:0,y:32}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.7,delay:.15}}
            className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              {name:'HubSpot',   icon:'🟠', desc:'Two-way sync contacts, deals & activity.'},
              {name:'Salesforce',icon:'☁️', desc:'Push leads and pipeline data automatically.'},
              {name:'Slack',     icon:'💬', desc:'Get notified the moment a lead replies.'},
              {name:'Zapier',    icon:'⚡', desc:'Connect 5,000+ apps in minutes.'},
              {name:'Calendly',  icon:'📅', desc:'Auto-book meetings from reply detection.'},
              {name:'OpenAI',    icon:'🤖', desc:'Power your emails with GPT-4 generation.'},
              {name:'Notion',    icon:'📝', desc:'Log contacts and notes automatically.'},
              {name:'Google',    icon:'📊', desc:'Sync calendar and track conversions.'},
            ].map((item,i)=>(
              <motion.div key={item.name} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.05}}
                className="bg-white rounded-2xl p-5 text-left hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg">{item.icon}</span>
                  <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="container text-center">
          <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.3}} transition={{duration:.6}}>
            <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-5 uppercase tracking-widest">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900">
              Loved by 30,000+ Teams
            </h2>
            <p className="mt-3 text-gray-400 text-base">Real results. Real customers.</p>
          </motion.div>

          <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto text-left">
            {visible.map(t=>(
              <motion.div key={t.name} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.35}}
                className="border border-gray-100 rounded-2xl p-7 flex flex-col card-shadow hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_,i)=>(
                    <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{t.initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-gray-300">{t.company}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button onClick={()=>setIdx(i=>(i-1+3)%3)}
              className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500">‹</button>
            <button onClick={()=>setIdx(i=>(i+1)%3)}
              className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors">›</button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="section-dark py-28">
        <div className="container text-center relative">
          <div className="absolute inset-0 pointer-events-none"
            style={{background:'radial-gradient(ellipse 70% 50% at 50% 50%,rgba(99,102,241,0.15) 0%,transparent 70%)'}}/>
          <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.3}} transition={{duration:.6}} className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-[56px] font-extrabold text-white leading-tight tracking-tight">
              Start Finding Clients
              <br/>
              <span className="gradient-text">With AI Today</span>
            </h2>
            <p className="mt-5 text-white/40 text-base max-w-md mx-auto leading-relaxed">
              Join 30,000+ companies already automating their outreach and closing more deals.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-full px-8 py-4 transition-all shadow-lg shadow-blue-900/50 hover:-translate-y-px">
                Get Started Free →
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center gap-2 border border-white/10 text-white/60 hover:text-white hover:border-white/25 font-medium text-sm rounded-full px-8 py-4 transition-all hover:bg-white/5">
                See Pricing
              </Link>
            </div>
            <p className="mt-5 text-xs text-white/20">No credit card required · Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Reusable feature section component
───────────────────────────────────────────── */
interface FeatureSectionProps {
  label: string;
  title: string;
  desc: string;
  bullets: string[];
  cta: { label: string; href: string };
  bg: 'white' | 'gray';
  flip?: boolean;
  visual: React.ReactNode;
}
function FeatureSection({ label, title, desc, bullets, cta, bg, flip, visual }: FeatureSectionProps) {
  return (
    <section className={`py-24 ${bg === 'gray' ? 'section-gray' : 'bg-white'}`}>
      <div className="container">
        <div className={`grid lg:grid-cols-2 gap-16 items-center ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          {/* Text */}
          <motion.div initial={{opacity:0,x:flip?24:-24}} whileInView={{opacity:1,x:0}} viewport={{once:true,amount:.3}} transition={{duration:.6}}>
            <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-5 uppercase tracking-widest">
              {label}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-gray-900 leading-tight tracking-tight">
              {title}
            </h2>
            <p className="mt-5 text-gray-500 text-base sm:text-lg leading-relaxed">{desc}</p>
            <ul className="mt-6 space-y-3">
              {bullets.map(b=>(
                <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
            <Link href={cta.href}
              className="mt-8 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-full px-6 py-3 transition-colors">
              {cta.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
          </motion.div>

          {/* Visual */}
          <motion.div initial={{opacity:0,x:flip?-24:24}} whileInView={{opacity:1,x:0}} viewport={{once:true,amount:.2}} transition={{duration:.7,delay:.1}}>
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
