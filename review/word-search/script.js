// Psych Vocab Word Search — game logic
// Terms come from ../../shared/data/terms.js; topic filtering uses ../../shared/data/topics.js.
// URL options: ?groups=memory,thinking (class topic groups), ?ced=2.3,2.4 (CED topics),
// ?dev (shows the overlap debug buttons and blocklist stats).
(function () {
  "use strict";

  const BANK = window.APPSYCH_TERMS || [];
  const TOPICS = window.APPSYCH_TOPICS;

  // ---------- Blocklist (one-way hashed) ----------
  // Words are stored only as 32-bit FNV-1a hashes (base 36) of their uppercase letters,
  // so the list can't be read from the source. A rare hash collision just rerolls a harmless
  // filler letter.
  const BLOCK_HASHES = "duhg,tocn,272jf,2ih8i,2mjio,3t85a,4mjj2,6cefd,bc9fr,bhst0,bvdzi,c8si0,ciri4,d3eng,gls4m,hswkj,ijaa8," +
    "iwjb2,kd5qp,l5g4t,q9pfk,r1zjm,rxl31,sb3e4,trmcw,u4bqe,uxrze,w7cqt,xd4up,xgrii,y3gax,zpsxl,11glxf,11i" +
    "5m4,12kzoi,139i1s,13baxm,13r81v,148cwi,14mo94,15mmge,17ybj9,19chb2,19x5xk,1boabi,1bvh6e,1c7pmw,1cbs1" +
    "p,1d5j5t,1do3fd,1h4o4u,1h4pje,1jx4p3,1kjvin,1laf2e,1lhm45,1n4v6o,1o0n9y,1pzfdl,1rplo9,1tyugj,1uwiuh," +
    "1v518w,1vg6b4,1xlsgh,1znyqp,203pi3,20qxmv,20u8u4,20zrt6,22xgst,23zm5o,24sz6o,26qqhm,29is5q,2aa0d1,2a" +
    "jjzg,2c4ovx,2e8wjy,2g6jfh,2hbht6,2hzoia,2i5eqj,2inum0,2ljeur,2moib0,2objlr,2pbgnc,2pseb5,2rdrpv,2two" +
    "c9,2w7djw,2zpbta,302tkx,3164z7,31ofwo,324z9g,32dtuh,35d9ux,35ly7y,36qhrg,387ht2,3bup1t,3c5msa,3i1a47" +
    ",3ixvxo,3kd28d,3ni29b,3olqsq,3p8l6b,3qpmog,3umoyn,3v18m0,3we83v,3wh7b6,3xf5qy,3xtcr2,3y7miv,3zar4c,3" +
    "zfyr1,40nquv,419602,41tryp,467g1f,485nyq,48lafp,4c43pg,4cv2r5,4d2hix,4deke4,4fhxo6,4g7d2b,4gxhik,4jd" +
    "0ih,4ks4xy,4ky6ef,4l360k,4m3pef,4m65l8,4ml6r8,4ndkyl,4nxmi3,4rrz35,4s6uyu,4te16c,4u2vo4,4w0t79,4w65f" +
    "v,4wp04e,4wxw9w,4ygpla,4youmr,4zmrvf,507pta,517c9v,53clrh,53wm21,55ytfq,56nqrk,57re78,580rm7,58cjwy," +
    "599a6e,59v3dx,5bhm8x,5bjyxn,5cyknf,5ddtzu,5ei5oy,5en2cd,5esyos,5ftsko,5gexk0,5htamy,5ij1nt,5mjpip,5n" +
    "5na7,5ogxo9,5pm860,5qpfj8,5s7fuu,5tj6za,5tt51b,5vpddf,5wgnpg,5wphwj,5x71b2,5xl71b,5xr0yj,60hhg4,60r1" +
    "8n,60xhl3,61y5g2,658oqd,65q9bq,664hv4,66g6ri,66n1sg,67iwln,6938jv,6c4m1t,6ddssg,6el40v,6fi65o,6hw9wk" +
    ",6jizz4,6ma8bk,6mfva7,6mynlh,6psnow,6sco2t,6t1uwb,6t3n59,6tbb9m,6wde9m,6wpf8u,6xe767,6y81fn,6yi514,6" +
    "zxxe2,72ydgn,73sin0,757n8w,76coqz,77070w,77fp8u,78nx8z,796w6j,79avlo,7bi0kb,7bir95,7bk1k6,7hkldv,7i0" +
    "7y6,7j9joo,7jmu6k,7ke8h4,7lhdfa,7loamd,7mb4zo,7nsdha,7rl1xc,7rx0ll,7s63xs,7t3o5c,7tmb4u,7vywta,84w4c" +
    "o,86i0ak,89dgpc,89pcas,8afdl1,8drtsi,8e3fet,8e4da0,8ebgvf,8etmfj,8eu68h,8f8lxa,8gprav,8h6kdd,8hrj3u," +
    "8hy541,8ixe24,8k3i3c,8kx8y6,8ky17u,8lifui,8maatr,8o5930,8qpczu,8s5the,8xfkpq,8yexud,8zn033,8zpb66,8z" +
    "wdgg,904uhs,90x4iw,91ymd2,92n3il,92ukia,93y2ez,97o23e,9a0wuz,9bkv9z,9bu94u,9ddk3s,9eccpk,9f3hlu,9fmx" +
    "7x,9idcjt,9ig1lo,9keiqb,9lscoj,9lyrcq,9mqhhe,9n1sj7,9n70aj,9na9bk,9ose1n,9qs3og,9soxp2,9v8ov9,9xvmxd" +
    ",9y1h9f,a2fqdg,a3hxxy,a56vda,a6rrmb,a8fsb9,a8vifr,a9c5bb,aav0kj,afvy63,agk82l,ahcp2p,aho4vc,aidhc0,a" +
    "iieyk,ak58k2,akio4x,aklhr0,alffrs,alsmig,ampkk8,aqor76,arklyy,asy582,atdbt2,atpj7c,au2n6y,avbqsj,avg" +
    "dck,avhxlj,aw3lom,ax58h0,azb7j5,b0vb4o,b3v1yt,b3xi7h,b4y56h,b5nuq8,b7p5fg,b9mt7p,baorav,bbnizk,bbzl1" +
    "w,bckv30,bcopro,bcu675,beks2i,bfvhnx,bgjxm9,bjbkup,bjireh,bkophj,bl7ajy,bl9728,bmlznk,brbe2t,brfk3s," +
    "buf8mu,buvknk,bwuwvn,bytozh,bzgha4,c478ee,c4jy1z,c4xuq4,c6btt8,c9g2z3,caqyp7,cbewao,cbf7vz,ccikbs,cd" +
    "fpm5,cdn3v7,cdtu6r,cf5jj5,cgzp1q,chdvmi,chs1s0,chx54e,cif36b,cimyda,ckwx26,cl6o0w,clo2sn,cm275r,cmcs" +
    "9a,cnc06l,cnphgi,co6pxy,corezt,cot051,cqkg7a,cqo6ca,cr0v13,csnr44,csopb8,ctdydh,cusg1o,cv290u,cvdiw8" +
    ",cw7d9x,cws1y6,cztqqw,d0316g,d256m5,d2cnvm,d2dhcv,d4gpnk,d7g19s,d96vzn,dd5wqj,ddm7ky,dezsjw,dfbysk,d" +
    "hfz9a,dj4hvn,dkp4cb,dlvjfu,dmgo1g,dmpnnl,dndyj9,dp3fzt,dp52ss,dqhkr0,ds6vne,dsctk8,dtcvtt,dyer4o,dzh" +
    "5jx,e0jqzo,e0q5bo,e0regt,e13r97,e1zax1,e4k80b,e7lxqb,e7qanh,e7yuxe,e80lpg,e9202z,e9o03q,eb6asb,ebxlc" +
    "9,ed6tkm,ehehz2,ehf1l1,eijlpp,ejnvsc,ejwug2,ejzrok,el58m5,emqq9e,emu9yv,enmlbx,eraah6,esbz8h,et4gmk," +
    "et4ph4,etjwl5,eurhq7,evy3zy,ewfdpx,ex9ke6,f0r311,f1jtqs,f26z5p,f3g204,f58b9t,f5950z,f6oksq,f7n4uv,f9" +
    "4a0n,f9l26k,f9ml5o,faiuw1,fcmxb6,fdfabt,ff90eu,fi2ntt,fjz21o,fl42e3,fl7nev,fmx0c3,fnfify,fnvb54,fpkq" +
    "j4,fprsos,fpwx2v,fqt1sl,fspli1,ftpu1y,fu2l4e,fu6csf,fu9cib,fusiyp,fvfd5z,fw5dni,fwo2od,fx0u8c,fxujb2" +
    ",fyisi2,fyombm,g00dd2,g1kd53,g1t90j,g2eszz,g2jlux,g9hjkt,gba43j,gbgwsi,gdc5ag,gic9iy,gjldn5,gjqni0,g" +
    "lf9ss,glu0c3,gmkzow,gmwncp,gn57ic,gnc53m,gnr62j,gp6p16,gphx4x,gpnhww,gr7h44,gritne,gsodlj,gv7i78,gwi" +
    "447,gwuh4u,gx1w6h,gxbk1s,gxgsgq,gxurqt,gze4u5,h36cvs,h3cc6z,h4otxi,h6crp7,h755vp,h7imuy,h7mi9b,h8ord" +
    "k,h9qf3r,ha40yc,hal8tr,hcij49,heak2k,hfap45,hg2std,hgjxtm,hgybcw,hicbvj,hkdk8g,hkk7mj,hlzz3z,hmyjt7," +
    "hostfu,hoye7e,hqdaos,hqh80r,hrijxl,hscv7e,ht48g4,hwseja,hy1dpf,i1561m,i1xeij,i5vnv0,i6tegi,i7847i,i7" +
    "fx3t,i8bp0r,i95dl6,i9dqcq,i9ktjh,ibep21,icbq9p,ie957i,ifxyyr,igt05h,ih3e6e,ihntmi,ihsy0l,iiwurq,ikzk" +
    "r1,imi2mf,imo8wi,in75jy,ioftbf,iouizj,ioxtns,iqlv8e,it8x2y,iv2nfq,iw5y4o,iwfeid,ixr7dv,iy5tsk,iyh17i" +
    ",iyn82i,iz4yfg,j03tbe,j13kql,j1rf11,j1z7ps,j2bk6u,j2dcej,j2i9kp,j2qx0u,j3v215,j4ypq9,j6q2eo,j76icy,j" +
    "8q6q4,jar6gz,jb7mtp,jbyq4q,jccbll,jeuf9s,jf4og8,jff08i,jgputh,jhvor7,jigl5x,jiq7hd,jitb5e,jm7dmc,jmg" +
    "j8k,jn4tu9,jpb1ig,jqg000,jrz1hm,js30ui,js4i4v,jsv9xy,jt4x73,jtkecx,jtu9oo,juewo8,jvvt5l,jw2icv,jwkuv" +
    "8,jy2kse,jz3ypv,k1q2jt,k212fn,k2slge,k3hz55,k6cm0t,k707j7,k8l5d1,k9ufam,kava37,kb5e6o,kb9lx2,kbmcik," +
    "kc0o7j,kc62em,kc9jle,kcsj7i,ke4gn9,kep8s0,kh1zad,ki6vta,kjf0ya,klrbt1,klrm8e,kngw53,knn7v6,kqe5pk,kr" +
    "bnzw,ku665u,kuewkg,kunvbf,kv4fot,kxav2i,kxt3w7,kypekb,l0cj2n,l0xvgj,l17eaw,l1afur,l319ke,l32dhr,l3ni" +
    "hl,l4bn3u,l4tuge,l53ca8,l5qj6z,l6i8rs,l6njlh,l7oomr,lafakz,lb4h6k,lb9qjs,lbd1xp,lbkj4o,lco41j,leubb2" +
    ",lf42q7,lh46kw,lhcfvg,lhij3n,lj6ww8,ll9on5,lm4rsc,lmcy8r,lmr97f,lmvscz,lndfq6,loyo5q,lp50tg,lr3nmt,l" +
    "rzcc4,ls6ld5,lu496p,luky1k,lv55pl,lw1jlm,lxhx0f,lz6y1x,m0kjry,m1ta66,m20h4q,m21vjj,m2z4zv,m3aq6w,m43" +
    "zyk,m6d86k,m6id7u,m7c6wu,m7eqoy,m8050j,m8sfjz,m8xwpf,ma3z2x,maorzs,mb2v0r,mbcnay,mcdwsy,mcjue5,md9pq" +
    "z,mdwvu9,me9523,megvnm,mexf1z,mipiu7,mjojnu,mjpwik,mk7bra,mks7pv,mo6mm8,mobg4o,mq8pfq,mrbui2,msus23," +
    "mt3049,muuib6,mwe4c8,mwfqav,mz4ki1,mzwm6e,n0viqr,n1mfyx,n3o6yr,n3y38r,n4e139,n4u1ht,n61ngl,n7c43b,n8" +
    "fqlx,n91fnk,na53oz,nackkm,nas5uh,nazycc,nbfx22,nbs3ej,nbtvsd,nctzg1,nd5mne,ndd6v7,ng5nve,ni3k2r,nidi" +
    "98,nimnea,nj1ao9,nkoy8s,nl3pon,nm3lul,nmihcf,nn42ey,nngu45,nnjhz4,nnm31a,no62wn,noo9hq,np0vhm,np6qfv" +
    ",np7s61,nplqi6,npv4yh,nqtzn8,nqxfkf,nrr276,nu63g8,nvhhuw,nw39d0,nwq5s1,nyigy2,nyl8br,nzjely,o0ekfi,o" +
    "0nbmo,o2bbip,o3fifo,o40p8l,o4w7vd,o50gig,o524eu,o5hr1x,o6pnes,o7stgc,o7wny2,o85yal,o8dqfs,o8hf0u,oay" +
    "xcq,obi62h,oc1ydn,oc5o5d,ocu0ze,odezj8,odpw4a,odzek4,oemk0o,oh95ug,ohfsmr,oikiux,ojlzul,okdk2d,ol8yq" +
    "h,on29ma,oo5nyu,oop8ne,op4292,oq9ac4,oraxpk,os7em9,oseiqc,otxel4,ouzzbg,oxeo1o,oy52fy,oyep9c,ozqhmj," +
    "p0pbvt,p12kqs,p12oub,p13r5s,p1n8uo,p36452,p4lbbm,p5urok,p6vwk0,p7dsm5,p7kelj,p7obz1,p8ztoz,papxc1,pc" +
    "5sei,pfsras,pgrol8,phlc87,phpgcw,pj2fuq,pjcmp5,pjx53k,pk3aq1,plubyk,pm21l2,pmgm5b,pmv5d0,pmykj4,pn99" +
    "hk,pnwa5s,po288r,pou124,ppbcr2,ppfp1o,pq0szw,pqxukz,ptyak1,pwspqg,px1eox,pxfc9u,pz4gmt,pz9le5,q0ezg5" +
    ",q1ss0w,q2ha8q,q2iug0,q2jljb,q3onmt,q427qe,q46wuh,q4fetw,q520rw,q7yzst,q83ypk,q87xhj,qa852h,qd5q2z,q" +
    "hdyrg,qhppyx,qhv0qy,qiyc87,qj09rj,qk8woa,qkzb2x,qle9jy,qm40pi,qmdh29,qqf72i,qr7o9g,qsx769,qti0zo,qtl" +
    "snp,qtuvah,qtxjy1,qtyird,qu91yu,quw0rr,qv2g2o,qvxmud,qw2him,qwgtt4,qxq85l,r0nq1k,r0w3ta,r2z97p,r4h7z" +
    "h,r5asnt,r5fd1t,r71jjg,r763tq,r8qjj6,rc14rr,rcvd1s,rdf68d,rdt4zt,rea810,rfrjvw,rgb4i3,rj883n,rjxgue," +
    "rk6o31,rm5xz2,rmw096,rnii8m,ro5te9,rpl5tm,rqcrh4,rs9dxt,rtiygv,ruix8g,ruobbc,rwo5tc,rwvly5,rxwxw1,rz" +
    "ui6g,s0w439,s3g04t,s5s31t,s7ckws,s8mbna,s9mx1k,se4ix5,sf3jc5,sf6bd2,sgflv0,si8ygc,si9njc,sm34s9,sm9h" +
    "pe,smbe1j,smbn47,spu5vo,sqe4o7,sqj7t2,sr6je1,srpyce,srw64q,srwmbr,st1z02,strr8y,suu2ft,svtx6q,svyqo5" +
    ",swend3,swmeun,sym24f,syup96,szd4jm,szqsi8,t0vr6g,t4bghi,t64s9h,t66fxy,t7dcsl,t8ok5y,t9htno,ta4egb,t" +
    "cbqxk,tceayp,td3qtg,tflk65,th8n49,thohkx,ti37ty,tjieik,tjn0vv,tk0z6n,tkh5r7,tkyw73,tn6czx,totgsj,tpk" +
    "ysj,tx0509,u117pw,u2j3j8,u5iv6l,u5skmn,u63359,u6djg8,ub1ayy,uch353,ucq0vj,ud0r6y,ues16w,ugvab2,uhmb5" +
    "a,ujo5rl,ukgwc7,ukhmo8,ulnjnc,uoo9ia,uormvv,upq57y,uqiqw1,usa9of,usjjc4,usofrn,usr6u9,ut8q0t,uuibyf," +
    "uv00st,uxflbp,uxonui,uzoaip,uzpnxp,v0grx8,v12foc,v2boxi,v2pqzx,v4msu0,v4tk9b,v6pgtx,v73vne,v78j81,v7" +
    "o9jh,v80upv,v8yvdz,vau3dz,vc3t72,vck7mk,vexy21,vje8iv,vmnvip,vni6nc,vo2k4c,voev78,vosws9,vp5go1,vqj5" +
    "f8,vr67so,vskv2q,vst9zf,vsvpqv,vtjl6s,vu97hr,vva45u,vvcj3z,vvg0sk,vx3bu6,vxekfw,vxq65e,vy99rj,vyunw2" +
    ",vzfsot,vzy9dc,w3ms1d,w3tes2,w3y810,w587jb,w76o6x,w8atip,w8nba5,w9e3sn,wd4msd,wd7qds,wdgsvu,wdqoq1,w" +
    "e2a41,wg2fnb,wh75k8,wi2mqc,wia9jk,wiym1t,wj00t4,wnuu46,wo03p1,wp4bvp,wq2sl4,wr9avt,wrcz79,wtq06b,wtw" +
    "d13,wtyikz,wtzdka,wupugj,wv2ure,wvj0j2,wxps0r,wylite,wyqxtd,wznnsw,x03oid,x045bi,x0oqkd,x33305,x4585" +
    "h,x4fwku,x522eq,x5kxjb,x5mmf0,x5rgvm,x7bv22,x8b3ql,xainpc,xetkhq,xfjl6w,xgo2ds,xh7c4i,xhj54y,xkr26w," +
    "xldhzv,xo92dh,xotjlt,xpnxjv,xrt2du,xs3mxs,xspd2y,xy53ou,xzs35y,y0bnzj,y1mcz2,y3l5my,y4hmyr,y5orm3,y5" +
    "wagd,y61tyj,y6t3nn,y7jtoq,ya01oy,ybyyr1,yc4sio,ych6gt,yd4hak,ye5apl,yebbjy,yfklz3,ygx8nx,yh13h0,yi6h" +
    "ir,yis0fx,yj39u9,yj3l1a,yj4849,ykpax5,ykvh8e,yln08z,ynkbtc,ynpuzy,yoooxb,yp5plp,yq6qzg,ys05dk,yugu0y" +
    ",yuo6gs,yvd8h0,yvmvt4,yvpfps,yx312p,yxcfcg,yxi8gl,yyl5f6,yysynt,yz1fjw,z18jdc,z1epdk,z36nve,z3hqpl,z" +
    "3ue4v,z40pit,z54yac,z8q3dz,zaowxp,zbfpe0,zcui74,zd3ffs,zd8dzi,zdazyi,zdo20x,zdw0qt,zeqwxr,zesqzm,zgq" +
    "cq2,zh0ctf,zis5y4,zkm6xf,zli1lb,zlm141,zpidi2,zpxv76,zq0etf,zqpxh8,zs1oaf,zt516t,ztud3p,zv0gj7,zwnpy" +
    "m,zwp906,zwxhou,zxq9p7,zzav0y,100fwth,100pm4m,1057bom,1057urh,1079qwz,108j9fe,109fwoo,10cvy5y,10dqlv" +
    "w,10e0wqv,10gli63,10gu7sq,10h1ku9,10hns84,10ivd9w,10kanvj,10lpiu8,10m4m0w,10p26g4,10p8q1w,10rwgxp,10" +
    "tabud,10ug12d,10vv70l,10x3fyp,10yhge0,10zv03e,110foku,110koqj,110s4cy,1110qqk,1120h4y,1126lw9,11399s" +
    "u,113e4fg,113kyh0,113vvo1,117ah7o,118a6uc,119i8j7,119jjfe,119lh8d,11a0bjk,11am0ee,11be2fh,11bwfrb,11" +
    "bx5x5,11c1llt,11ck0hc,11cuy6b,11dja62,11ekez3,11f8s3p,11fp7sh,11hjzxr,11htaui,11hx2a7,11j7j4t,11jg5b" +
    "p,11mr291,11nbnsn,11ngidd,11noeib,11o8zc5,11qe5h6,11tmdbt,11ue223,11vmqrv,11w5qnm,11wqc6z,11ym952,11" +
    "yn3v2,11z9vra,1248ryx,125przx,125z2sa,128g5xc,128k7wj,129gdmo,12a8p8w,12c9ayi,12cb23n,12dsjid,12e4ru" +
    "v,12flu22,12gggfm,12h13uf,12h1ndk,12hinfr,12ix1lp,12rcaic,12sabhm,12twvf8,12w2v06,12w613c,12xg8c7,12" +
    "ymfqx,12zcoth,12zq7c1,1302qhz,130h0kc,1318qln,131z9u8,135o3yy,13705tq,139fslz,13bhr91,13bptmy,13cjyv" +
    "8,13d1ax5,13dzx06,13e1ivl,13gzmhb,13hajme,13hhgne,13hu90m,13iibcv,13irsuk,13j25it,13ja39z,13k1cfz,13" +
    "kpr38,13m676y,13mdp3k,13nf4qm,13qpzjh,13qtn58,13ra1qr,13rs0l0,13t4lc0,13t9hum,13tcxuj,13wh0ca,140g2g" +
    "r,140xzr9,142146g,142wa62,1451qnh,1455azn,147g5ps,147g6ac,147lser,14bm5ik,14bq72w,14cjhnb,14cncom,14" +
    "cs4i0,14drayc,14f3uv2,14fdx4g,14fjmdz,14g3hq2,14g9joz,14gc00l,14hp9dw,14i17rz,14i64yv,14ir3yc,14ja33" +
    "m,14jwhxc,14kg1qu,14kyqss,14m0tbg,14mofvq,14moo5s,14nbawv,14rfjew,14ubslr,14ujkbj,14vbt80,14x9woa,14" +
    "xjoqz,151y7ae,152g2fp,152ooah,155fcp8,155jwhx,15682tj,1569adr,156uh4p,1579id9,157n7cx,157ushx,15begm" +
    "5,15cyiuk,15d3di9,15fvtar,15fyp4v,15gbc6h,15il4qm,15iq1o7,15kukwg,15o9rwk,15qdxhq,15qmvf2,15r407i,15" +
    "r5oep,15r7z0o,15x0p73,15xwdo8,15z2p56,162volb,163luko,163wuox,164z7tu,1652zdq,165n6pp,168pzkj,16a1yc" +
    "0,16a394k,16ab747,16b9qc9,16ca7ax,16chzrk,16cku53,16di6gc,16dlv0x,16drh5v,16eul9t,16ezan0,16fs6o0,16" +
    "g4flx,16gou6t,16h8mi0,16hnq9j,16ih40t,16iqx6j,16jbpco,16jxpcx,16kg071,16kyioy,16l5bnk,16lbz33,16lrc9" +
    "q,16ofzsr,16orhud,16ovy92,16q5ol9,16rqysv,16spx66,16uiaoi,16v599x,16v74j3,16vqvcp,16w1imn,16waqbl,16" +
    "wz8nx,16zq1ij,173i51n,175dspe,1765p26,176m1py,176oj6a,176t3j1,1770z2s,177cglm,1797q81,179j8ph,179oio" +
    "u,179zxzm,17a225u,17a57zh,17anb1k,17bzzea,17cdguy,17d1wg1,17e4we5,17ijmwc,17inkh4,17jolp2,17jp687,17" +
    "jug8a,17m0jmy,17mfk5u,17mj1xq,17q87rs,17rks06,17s28ls,17t5ync,17t7z5l,17tg7jn,17x8q4x,17ynkpm,17yqqa" +
    "g,17zmpne,180r83j,1816nhy,182tyl1,183pstu,18495wg,18498qe,186na8s,187df1o,18c0oaw,18f225d,18fqdqx,18" +
    "fyk5t,18g3ins,18g56ji,18g7xd5,18galvu,18gsovh,18hw029,18i670c,18iemxx,18jazz6,18jcvay,18lvfri,18nbpr" +
    "9,18nfvec,18os85a,18pysgb,18qbbn9,18rohrz,18suwls,18t1i6s,18t6g4q,18tnyww,18uehw1,18v90bn,18vevyh,18" +
    "zgaj7,18zmyki,191pnaa,19224xi,194mjfl,1961kso,196y3jh,199zqqw,19a8ua2,19bwecu,19cntus,19doadr,19dsid" +
    "p,19e3je0,19fl50z,19gyyey,19h1dmj,19hdrqx,19hx209,19j42x1,19jn1ej,19jzwni,19kit3t,19l7rxv,19mlbj6,19" +
    "n9zxq,19nh1ip,19o3qzr,19ohxo7,19orxd9,19tfxje,19ukcle,19x75dv,19xbfw1,19yi7jy,19yl0bl,19yp4gr,19zcnq" +
    "2,1a29syz,1a4bi6h,1a4xdb6,1a6v5rw,1a6vud3,1a79ct8,1a7do89,1a8zb46,1a9h1vi,1ac5m3z,1ac6doo,1acci37,1a" +
    "d2y44,1adr186,1af8ozj,1agcd56,1aksd41,1am1yh0,1amvjxx,1ap3k55,1aqnu52,1aqxa9o,1asptax,1atlpiu,1avyf3" +
    "e,1awgcwq,1awhlwt,1ay4byz,1az7k4q,1azk9or,1b26scb,1b3lwp3,1b414xg,1b4n5ud,1b512a0,1b51flb,1b7b9hx,1b" +
    "7u1v9,1b8mkho,1b8xit5,1b9dbg0,1ba2s56,1ba38kx,1bbdi5r,1bdszzv,1bfcpb3,1bffdyp,1bilz05,1bizueg,1bj6ri" +
    "o,1bllu0s,1bluww2,1blxsq6,1bm6sas,1bn4wfm,1bo8255,1boqnom,1bou5ur,1bpdqdx,1bq7ls4,1bqbaq3,1bqr974,1b" +
    "rxt60,1bsuzh0,1bsvghb,1bt0dl7,1bt6xmw,1bu2zki,1bum8wy,1bun1ur,1bv8q2p,1bwgn1o,1bzbwp1,1bzfs2p,1c0hwg" +
    "j,1c0y83g,1c0ysmq,1c1r0fc,1c1ti1w,1c1vt9w,1c21syf,1c23xhi,1c28q1a,1c2bvj9,1c2qu0m,1c37ura,1c3qu2w,1c" +
    "42u48,1c63cg6,1c67kfo,1c6dz9t,1c8xlg2,1cbxkpi,1cd2d8h,1cdgjx3,1cdtb8k,1ce9xml,1cer8xq,1cerz26,1chjlb" +
    "r,1chw68p,1cid8kk,1cj17y4,1ck4m84,1ckd0jx,1ckh677,1cmxqp3,1cnixhl,1co14d4,1co9ahc,1coi3se,1cosg02,1c" +
    "pw20w,1cqmq8n,1cqwdme,1cqyf3o,1crpfo8,1cs6pou,1ctt79p,1cuicc7,1cuz5rl,1cx7pph,1d0qui6,1d3abgx,1d5rdy" +
    "h,1d7hixz,1d7zf4l,1d88ixd,1d8zzpe,1d90dln,1d9ez50,1d9xp2w,1dbhvzt,1dbm2as,1dciul3,1dcvf43,1dfg40i,1d" +
    "fhc8g,1dgf99f,1dgoufu,1dh2yzj,1diripb,1dm045o,1dmvej4,1dnz2ht,1dpxmpz,1dq4535,1dr3qhj,1dth1w0,1dtnff" +
    "4,1dtugss,1durtzw,1dvzpun,1dxgdet,1dy3y7z,1e0cb56,1e0xph4,1e19pr2,1e2d8q2,1e2kzpl,1e4n55r,1e5rozp,1e" +
    "5t522,1e919c4,1e9ey9u,1e9vyne,1ea205s,1ea3nlo,1ebb0u5,1ebbaj4,1ebx1p5,1ec9g9v,1ecio5p,1ef03iw,1efb3a" +
    "3,1efdg80,1eg8rcn,1eh9ap4,1ehacdh,1ehdpr4,1ehgwaf,1ehkmbh,1ei82yz,1ej35ts,1ej6yrh,1ejcu3x,1ekaeup,1e" +
    "m5tvs,1emz3cn,1en5dmj,1eo4whw,1eoimh4,1eok90j,1eoq2y4,1eoy9nr,1ep76d6,1epms33,1eruuik,1es4x1w,1essak" +
    "j,1ete5l4,1euc9y7,1euogt3,1evvrm2,1ewal7q,1ewcmbh,1ey925s,1eyxqzm,1ezaao1,1f012x5,1f1tx3i,1f2lqv8,1f" +
    "5iq07,1f5osc8,1f5vtva,1f5yeet,1fc44g7,1fcd8bh,1fd5l1h,1fen865,1fguv5w,1fip8gm,1fj4fn5,1fjiwa6,1fkgzl" +
    "z,1fl4jk4,1flkr3h,1flwuh1,1fm6hqv,1fm7qoq,1fmm11h,1fmnvza,1fmxhh1,1fnf9jz,1fqk9hm,1frdtrz,1frhyoe,1f" +
    "sf4g6,1ft4vcn,1fu6bkq,1funkat,1funp7w,1fv7b5z,1fxs083,1fzmynh,1fzp98l,1g059w2,1g0agkv,1g2l8vu,1g32ut" +
    "3,1g4e1ve,1g4ltq9,1g4mtkj,1g51dcy,1g5e1ma,1g5pjgj,1g6insh,1g775k9,1g7zry3,1g9gt9y,1ga2v9y,1gb5hzf,1g" +
    "drj02,1ge7rmm,1gih02y,1gj9d59,1gmhbis,1gmvm4g,1gqci61,1grg1en,1gs3aug,1gtm63i,1guiqlk,1h2bw81,1h3a13" +
    "n,1h3hmx0,1h50wbl,1h5kyk5,1h5la3l,1h5xreg,1h62uo2,1h7fcep,1h9nr4q,1hbq0ih,1hgjnci,1hgk6b0,1hje9ba,1h" +
    "jjjn0,1hkiik7,1hkogi0,1hmom7r,1hn08fl,1hn5ajn,1hs1vw9,1ht8y2s,1huphvb,1hvz78h,1hx1oec,1hxe23z,1i096g" +
    "f,1i0inhp,1i11jwd,1i2ktdo,1i47j0n,1i6olqu,1i9jovh,1iafygg,1icgfly,1ietse6,1if5vjz,1igxx8y,1ih7cm4,1i" +
    "jgka8,1imu0nj,1indgdb,1iojsf5,1ip6f8p,1ipawvm,1ipvgqj,1iqhihc,1iqnt4s,1iqz7a8,1irybj8,1isgr81,1issvd" +
    "u,1iuvope,1ivcxvu,1ivdkp5,1iw2dbz,1iwyw6q,1ixy850,1iyn75e,1izp8vx,1j03cw0,1j0r7wt,1j0tjff,1j11qpw,1j" +
    "24467,1j2a9xz,1j63qyw,1j6io8b,1j8v0nm,1jb5h6c,1jbd03r,1jc4obt,1jcwzox,1jeehes,1jeuurj,1jf186s,1jhc3s" +
    "2,1jhttb1,1jmaef0,1jmtv4p,1jn403i,1jn7lu3,1jnmvim,1jp1bk9,1jr6evy,1jt5xqu,1jtu9xl,1jxwskf,1jxyfcb,1j" +
    "xzy9q,1k0hhiz,1k1hkqu,1k1jr5h,1k1m66o,1k3e3jj,1k437ub,1k4bhbh,1k56586,1k675i1,1k75amg,1k7aprz,1k9v32" +
    "9,1kd002g,1keadw4,1keazuh,1kej4tu,1kfvioa,1khb6ji,1khelkw,1khff74,1kiwswc,1kkms02,1kl4lvj,1klhgu8,1k" +
    "lt5cv,1km4lj3,1kmfo5f,1kovmux,1kp3uye,1kqz52z,1krait8,1krsqzx,1ktn834,1ktvvka,1ktwkjv,1kv47zq,1kvkmf" +
    "6,1kx22nr,1kxk1j4,1l3pdp2,1l4kvtx,1l5qrau,1l5ruaa,1l7tk36,1l98zoz,1lbzm8q,1lcem0m,1ld97y9,1ldn9v1,1l" +
    "gcdr5,1lh7oy8,1li672l,1lj9inz,1lktp8k,1lku2vv,1ll1b7d,1ll961n,1lm8su6,1lmpe1m,1ln5k22,1lpe13z,1lr3t2" +
    "e,1ls1agn,1ltwg5q,1lu25ue,1lu5f38,1lumx8e,1lvbee3,1lxsp6y,1lxylp5,1lzc83m,1lzoezm,1m0gf0d,1m0z67m,1m" +
    "1b3lk,1m1iw4s,1m2ov2j,1m3l6tz,1m3nwfe,1m4p1jy,1m4t0mn,1m6ga1s,1m9ahmk,1map9a5,1mbi7ta,1mbo856,1mc61r" +
    "g,1mcrlby,1mczj0p,1mdgvd3,1mgwq9t,1mhrvk5,1mj7w2x,1mjqwmy,1mljo04,1mmh037,1mmkexr,1mmp77m,1movalj,1m" +
    "pnv5t,1mqvcma,1mrrobr,1mrz5r5,1msw7tg,1muhshd,1mvsmb1,1mw55ua,1mxyjvt,1myvc5h,1mz3ht9,1n0bp7y,1n0vnc" +
    "o,1n1yg3h,1n33xy4,1n51mdx,1n5dz80,1n5eb25,1n6i36p,1n6ryqw,1n73wy5,1n7x176,1n9bnyf,1n9kkz7,1navpkb,1n" +
    "bo72j,1nbumzw,1nfgwln,1ng24zl,1ng763j,1ninylq,1nkkoh4,1nl1v62,1nmx9hk,1nnvshr,1npk5qs,1nqi1rm,1nr15o" +
    "v,1ns851y,1ntlqyn,1nvd9cu,1nx42e5,1nylyu7,1nzgh5t,1nzpl0w,1nzy9g3,1o1hkc2,1o51aoz,1o6su94,1o6u8gi,1o" +
    "73o34,1o78kdv,1o9fpok,1o9q36p,1o9tpuu,1o9xy1j,1oaudmb,1obmdg9,1ocgrcv,1ocmjno,1odyp8t,1ofmiui,1oggsf" +
    "3,1ohr8ws,1oidhdq,1oj66t6,1ol89j3,1olyzk6,1omzuco,1onyyq2,1oo1iqf,1opbf2g,1oskcb6,1ot5gkl,1ot9b7r,1o" +
    "uo1ii,1oxrumj,1oxykf1,1ozd357,1ozkru8,1p1hzdg,1p383fs,1p3dh9l,1p3wapk,1p41iez,1p47qrv,1p6f4xd,1p8azn" +
    "0,1pats5c,1pca5b4,1pdhcbb,1pdwy9k,1pe0wpn,1pet6qx,1ph0pqa,1pi5cae,1pi6z2d,1pl69cj,1plrpgc,1pmnt10,1p" +
    "ns0zf,1poe5ql,1pojs1t,1poz8wf,1przzmd,1ptx7hb,1pu5nen,1pvd228,1pvoeg0,1py7w2k,1pyj1xx,1pz35rj,1pzqm5" +
    "s,1q0uzg9,1q2hzu4,1q4t7kr,1q5am3h,1q5l5pr,1q5n4aj,1q5rbvw,1q5uudb,1q7ep95,1q7jx1j,1q7q6uy,1qaab6c,1q" +
    "b896k,1qbn2s8,1qbv7b2,1qbxz12,1qckgwi,1qdtegn,1qfeixd,1qfhw4l,1qgal93,1qh9u48,1qiwoon,1qizf6h,1qjt5h" +
    "5,1qkcxz0,1qkqs1s,1qlut62,1qmh6pu,1qneeyi,1qnh7nc,1qpbaa2,1qrmgsy,1qryf3c,1qui1co,1qw0lpk,1qwkyj8,1q" +
    "wlghw,1qxf5gt,1qxt55b,1r0p1s4,1r1a1q9,1r2kizu,1r31kjf,1r38gxo,1r3w8hj,1r4kv14,1r5pbdt,1r710lm,1r7abu" +
    "y,1r7hi62,1r7ye78,1r8db7m,1r90noy,1r9ajen,1rclpq8,1rdyyrz,1rftlqp,1rfuyac,1rg46x6,1rg6y33,1rgdd01,1r" +
    "jepxg,1rjvcqj,1rkr832,1rpern6,1rq0kz7,1rvdjo1,1rwkx46,1rwpnir,1ry0fva,1rznty8,1rzts1z,1rzu71q,1s0amc" +
    "1,1s1l5sd,1s3gk03,1s55k6d,1s5ins0,1s5zp9h,1s6t1be,1s73wib,1s8qkev,1s93sej,1s9rpq5,1sa4z7u,1saldvk,1s" +
    "ap9n4,1sbp3t0,1sctu9a,1scu568,1sd8nuy,1sf10y3,1sfbyjd,1sgpltv,1shb7fm,1shfv6k,1sho46g,1si2rwk,1sjtef" +
    "o,1sk2lp2,1skiq9h,1sl5fm5,1slejl7,1smgesv,1sn4yhz,1sohks8,1spsfmo,1sqaofc,1ssytda,1st4ofb,1suhbew,1s" +
    "x1o6q,1sym2y1,1t0flvo,1t0y38r,1t16inq,1t1djj5,1t2fq03,1t5we46,1t6qgxf,1t78e0i,1t8ewz9,1t8nias,1t8z3o" +
    "5,1t9ixex,1t9m3he,1ta6mgc,1tafhfg,1tb0s6b,1tc15yf,1tdagj7,1textoz,1ti3gda,1ticmq5,1tjcw54,1tn6kr6,1t" +
    "n7cor,1tq7ti3,1tu5z23,1tufajh,1tvi10e,1tz1yt8,1tz84vi,1u1mlg2,1u1rgl6,1u1tq9q,1u2d83l,1u3o1j7,1u3u75" +
    "y,1u4ewbk,1u7t3ah,1u8yfmv,1ua3ae7,1uamrnq,1ubx3as,1uc50yp,1ucb6xz,1ue079h,1ue4xea,1ugjkgf,1ugqu1g,1u" +
    "gx7vm,1uk66lo,1ukwk6w,1um1aud,1unhhez,1unpnhh,1uo38lv,1uo39mo,1uojw66,1up9sfr,1upav4s,1upztz4,1uqtxw" +
    "b,1us2r0y,1us6vsa,1usdmjh,1ut0rw5,1utdmtp,1utq6qn,1uu2l8j,1uuyfgq,1uv7cgg,1uvga7f,1uwoe0g,1uxjbjd,1u" +
    "yt2a1,1uz2haw,1uzb7q3,1uzl1ad,1v0kh70,1v0melo,1v1aogp,1v54z49,1v5qjnn,1v68j6m,1v6tpm2,1v7ouvf,1v8jrr" +
    "8,1vazung,1ve5xet,1vgdclh,1vgpy4m,1vho7iy,1vhogke,1vjizeh,1vjnr2u,1vkyaxg,1vlv0ot,1vmi37h,1vmp5n9,1v" +
    "n9f0m,1vna24u,1vnge50,1vnwfzg,1vq53gp,1vsi5lq,1vsmaal,1vtj12o,1vuizgt,1vvk1pz,1vw8btk,1vwctdk,1vxdty" +
    "q,1vzmrmd,1w2zypt,1w6717e,1w81v7d,1w91gey,1w9mqsw,1w9qjoo,1was3i6,1wb9mrb,1wbon5c,1wc03gu,1wc8spj,1w" +
    "cnkat,1wf7wyq,1wfbkbi,1wfcr85,1wfec1m,1wflmkl,1wg65c5,1wgl4o8,1whmztj,1wkiy0i,1wm1fwi,1wmbbh7,1wn755" +
    "b,1wn7ens,1wp6mho,1wr1hk5,1ws66ce,1wsn4b6,1wtyttg,1wv4dsy,1ww4dvv,1ww7un2,1wx0ol8,1wxgiy2,1wy1x8u,1w" +
    "y5dny,1wyl81y,1x1xop1,1x29iou,1x2h5os,1x2znea,1x59e6w,1x69znc,1x8371y,1x8nb9w,1x9df31,1xb6vds,1xeqgr" +
    "e,1xexyeh,1xf8u5z,1xhqzlb,1xi16se,1xiituf,1xkpwlz,1xmugeg,1xp3wun,1xqaj8r,1xrl1na,1xtyec4,1xv168b,1x" +
    "vs83u,1xvuo1r,1xyquhy,1y029s8,1y0avot,1y0cfe4,1y2ldik,1y49hmd,1y4a8is,1y58s1f,1y5tp8i,1y5wbf5,1y6mdx" +
    "s,1y9845e,1yah7fk,1yaiqd1,1yalg1d,1ybg6ao,1ybmwlq,1ydk33r,1ye8gk4,1yed65g,1ygj3as,1yh3zf1,1yh535c,1y" +
    "j76eb,1ykvepu,1ylp74q,1yltx7h,1ym24ea,1ymin0o,1yoiqmk,1yolusf,1yowr3a,1yr62qp,1yr9vk0,1yrf5v0,1ysb88" +
    "1,1ytjow2,1yu091d,1yu5ebl,1yu87u7,1yzh05i";
  const BLOCK = new Set(BLOCK_HASHES.split(",").map((s) => parseInt(s, 36)));
  const BLOCK_MIN = 3, BLOCK_MAX = 18;

  // ---------- Levels ----------
  const ALL8 = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
  const LEVELS = {
    // Easy: left-to-right, top-down, and left-to-right diagonals (down or up)
    easy:   { label: "Easy",   size: 12, count: 6,  dirs: [[0,1],[1,0],[1,1],[-1,1]] },
    medium: { label: "Medium", size: 14, count: 8,  dirs: ALL8 },
    hard:   { label: "Hard",   size: 18, count: 10, dirs: ALL8 }
  };
  // The four lines that pass through any cell
  const LINE_DIRS = [[0,1],[1,0],[1,1],[-1,1]];
  // Direction category: H = horizontal, V = vertical, D = diagonal
  const dirType = ([dr, dc]) => (dr === 0 ? "H" : dc === 0 ? "V" : "D");
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const PASTELS = 10;
  const DEBUG = /[?&]dev(=|&|$)/.test(location.search);

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const gridEl = $("grid"), cluesEl = $("clues");
  const noteEl = $("note"), foundV = $("foundV"), levelV = $("levelV");
  const doneEl = $("done"), doneText = $("doneText"), live = $("live");

  // ---------- Helpers ----------
  const clean = (t) => t.toUpperCase().replace(/[^A-Z]/g, "");
  const same = (a, b) => !!(a && b && a.r === b.r && a.c === b.c);
  const key = (p) => p.r + "," + p.c;
  const rand = (n) => Math.floor(Math.random() * n);
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function say(msg) { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Hide the term (and its aliases) if a definition happens to contain it
  function maskDefinition(t) {
    let def = t.definition;
    [t.term].concat(t.aliases || []).filter((n) => n && n.length > 2)
      .sort((a, b) => b.length - a.length)
      .forEach((name) => { def = def.replace(new RegExp("\\b" + escapeRe(name) + "\\b", "gi"), "_____"); });
    return def;
  }

  // Playable terms: at least 3 letters once spaces and punctuation are removed.
  // Terms with digits (e.g. "NREM Stage 1") are skipped, since "NREMSTAGE" would be ambiguous.
  const TERMS = BANK
    .filter((t) => !/[0-9]/.test(t.term) && clean(t.term).length >= 3)
    .map((t) => ({ id: t.id, term: t.term, w: clean(t.term), ced: t.ced, definition: t.definition, clue: maskDefinition(t) }));

  // ---------- Topic selection (shared dialog: ../../shared/topic-picker.js) ----------
  const picker = window.APPSYCH_TOPIC_PICKER.create({
    items: TERMS,
    noun: ["term", "terms"],
    openButton: $("topicsBtn"),
    summary: $("topicSummary"),
    intro: "Terms are drawn from the topics you check.",
    onChange: () => newPuzzle()
  });

  // ---------- Game state ----------
  let size = 12, letters = [], words = [], cellEls = [], cellColor = [];
  let foundCount = 0, pending = null, cursor = { r: 0, c: 0 }, drag = null;

  document.querySelectorAll('input[name="diff"]').forEach((r) => r.addEventListener("change", () => newPuzzle()));
  $("newBtn").addEventListener("click", () => newPuzzle());
  $("againBtn").addEventListener("click", () => { newPuzzle(); gridEl.focus(); });
  if (DEBUG) {
    $("debugRow").hidden = false;
    $("debug3Btn").addEventListener("click", () => newPuzzle(3));
    $("debug4Btn").addEventListener("click", () => newPuzzle(4));
  }

  // ---------- Placement ----------
  function placeAt(grid, w, r0, c0, dr, dc) {
    const rEnd = r0 + dr * (w.length - 1), cEnd = c0 + dc * (w.length - 1);
    if (r0 < 0 || c0 < 0 || r0 >= size || c0 >= size) return null;
    if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) return null;
    for (let i = 0; i < w.length; i++) {
      const ch = grid[r0 + dr * i][c0 + dc * i];
      if (ch && ch !== w[i]) return null;
    }
    const cells = [];
    for (let i = 0; i < w.length; i++) {
      const r = r0 + dr * i, c = c0 + dc * i;
      grid[r][c] = w[i];
      cells.push({ r, c });
    }
    return { cells, type: dirType([dr, dc]) };
  }

  function tryPlace(grid, w, dirs) {
    for (let t = 0; t < 400; t++) {
      const [dr, dc] = dirs[rand(dirs.length)];
      const res = placeAt(grid, w, rand(size), rand(size), dr, dc);
      if (res) return res;
    }
    return null;
  }

  const entry = (t, res, seed) => ({
    term: t.term, w: t.w, clue: t.clue,
    cells: res.cells, keys: new Set(res.cells.map(key)), type: res.type, found: false, seed: !!seed
  });

  // Two terms can't share a puzzle if one spells part of the other (forward or backward),
  // or a find could match the wrong spot.
  const rev = (s) => s.split("").reverse().join("");
  const clashes = (a, b) => a.includes(b) || b.includes(a) || a.includes(rev(b)) || b.includes(rev(a));
  function pickTerms(candidates, n, chosen) {
    const out = [];
    for (const t of shuffle(candidates)) {
      if (out.length >= n) break;
      if (chosen.concat(out).some((o) => clashes(o.w, t.w))) continue;
      out.push(t);
    }
    return out;
  }

  // DEBUG: place k words (k = 3 or 4) crossing at the center cell, one per line through it.
  function seedOverlap(k) {
    const mid = Math.floor(size / 2);
    const terms = TERMS.filter((t) => t.w.length <= size - 2);
    for (let t = 0; t < 2000; t++) {
      // k = 3 uses horizontal, vertical, and one diagonal; k = 4 uses all four lines
      const dirs = k === 4 ? shuffle(LINE_DIRS) : shuffle([[0,1],[1,0], LINE_DIRS[2 + rand(2)]]);
      const pick = terms[rand(terms.length)].w;
      const ch = pick[rand(pick.length)];
      const cands = pickTerms(terms.filter((x) => x.w.includes(ch)), k, []);
      if (cands.length < k) continue;
      const grid = Array.from({ length: size }, () => Array(size).fill(null));
      const placed = [];
      for (let i = 0; i < k; i++) {
        const w = cands[i].w;
        const spots = [];
        for (let j = 0; j < w.length; j++) if (w[j] === ch) spots.push(j);
        const j = spots[rand(spots.length)];
        const [dr, dc] = dirs[i];
        const res = placeAt(grid, w, mid - dr * j, mid - dc * j, dr, dc);
        if (!res) break;
        placed.push(entry(cands[i], res, true));
      }
      if (placed.length === k) return { grid, placed };
    }
    return null;
  }

  function buildLayout(lvl, fitting, target, debugK) {
    const needTypes = ["H", "V", "D"].slice(0, Math.min(3, target));
    const byLength = (a, b) => b.w.length - a.w.length;
    const score = (p) => p.placed.length * 10 + new Set(p.placed.map((x) => x.type)).size;
    let best = null;

    for (let attempt = 0; attempt < 60; attempt++) {
      let grid, placed, picks, forced;
      const seed = debugK ? seedOverlap(debugK) : null;
      if (seed) {
        grid = seed.grid; placed = seed.placed;
        const rest = TERMS.filter((t) => t.w.length <= size);
        picks = pickTerms(rest, target - placed.length, placed).sort(byLength);
        forced = []; // the seeded words already include H, V, and D
      } else {
        grid = Array.from({ length: size }, () => Array(size).fill(null));
        placed = [];
        picks = pickTerms(fitting, target, []).sort(byLength); // longest first places more reliably
        forced = shuffle(needTypes); // first few words each get one required direction type
      }
      picks.forEach((t, i) => {
        const dirs = i < forced.length ? lvl.dirs.filter((d) => dirType(d) === forced[i]) : lvl.dirs;
        const res = tryPlace(grid, t.w, dirs);
        if (res) placed.push(entry(t, res));
      });
      const cand = { grid, placed };
      if (!best || score(cand) > score(best)) best = cand;
      const types = new Set(placed.map((x) => x.type));
      if (placed.length === target && needTypes.every((t) => types.has(t))) break;
    }
    return best;
  }

  // ---------- Blocklist scan ----------
  function gridLines() {
    const out = [];
    LINE_DIRS.forEach(([dr, dc]) => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const pr = r - dr, pc = c - dc;
          if (pr >= 0 && pr < size && pc >= 0 && pc < size) continue; // not a line start
          const line = [];
          for (let rr = r, cc = c; rr >= 0 && rr < size && cc >= 0 && cc < size; rr += dr, cc += dc) line.push({ r: rr, c: cc });
          if (line.length >= BLOCK_MIN) out.push(line);
        }
      }
    });
    return out;
  }

  // Returns every run of cells (any of 8 directions) whose letters hash to a blocked word
  function scanBlocked(L, lines) {
    const hits = [];
    lines.forEach((line) => {
      [line, line.slice().reverse()].forEach((seq) => {
        for (let i = 0; i < seq.length; i++) {
          let h = 0x811c9dc5;
          for (let j = i; j < seq.length && j - i < BLOCK_MAX; j++) {
            h ^= L[seq[j].r][seq[j].c].charCodeAt(0);
            h = Math.imul(h, 0x01000193) >>> 0;
            if (j - i + 1 >= BLOCK_MIN && BLOCK.has(h)) hits.push(seq.slice(i, j + 1));
          }
        }
      });
    });
    return hits;
  }

  // Fill empty cells with random letters, then reroll filler letters until no blocked word remains.
  // A match lying entirely inside one real term is allowed (e.g. inside "Meta-Analysis").
  // Returns null if a blocked word is made only of term letters across different terms.
  function fillAndFilter(layout) {
    const L = layout.grid.map((row) => row.map((ch) => ch || LETTERS[rand(26)]));
    const lines = gridLines();
    const isFiller = (p) => !layout.grid[p.r][p.c];
    const insideOneTerm = (cells) => layout.placed.some((w) => cells.every((p) => w.keys.has(key(p))));
    let rerolls = 0;
    for (let pass = 0; pass < 300; pass++) {
      const bad = scanBlocked(L, lines).filter((cells) => cells.some(isFiller) || !insideOneTerm(cells));
      if (!bad.length) return { letters: L, rerolls };
      for (const cells of bad) {
        const filler = cells.filter(isFiller);
        if (!filler.length) return null;
        filler.forEach((p) => { L[p.r][p.c] = LETTERS[rand(26)]; rerolls++; });
      }
    }
    return null;
  }

  // ---------- New puzzle ----------
  function newPuzzle(debugK) {
    debugK = debugK === 3 || debugK === 4 ? debugK : 0;
    const diff = document.querySelector('input[name="diff"]:checked').value;
    const lvl = LEVELS[diff];
    size = lvl.size;
    const fitting = picker.pool().filter((t) => t.w.length <= size);
    const target = debugK ? lvl.count : Math.min(lvl.count, fitting.length);

    let layout = null, filled = null;
    for (let tries = 0; tries < 20 && !filled; tries++) {
      layout = buildLayout(lvl, fitting, target, debugK);
      filled = fillAndFilter(layout);
    }
    if (!filled) filled = { letters: layout.grid.map((row) => row.map((ch) => ch || "E")), rerolls: 0 };

    letters = filled.letters;
    words = shuffle(layout.placed);
    foundCount = 0;
    pending = null; drag = null;
    cursor = { r: 0, c: 0 };
    // Each cell holds the list of colors of found words passing through it
    cellColor = Array.from({ length: size }, () => Array.from({ length: size }, () => []));

    let note = "";
    if (!debugK && words.length < lvl.count) {
      note = words.length === 0
        ? "None of the selected topics' terms fit this grid. Choose more topics."
        : "Only " + words.length + " terms fit the selected topics, so this puzzle has " + words.length +
          " words. Choose more topics for a full puzzle.";
    }
    levelV.textContent = lvl.label;
    doneEl.hidden = true;
    renderGrid();
    renderClues();
    updateProgress();

    if (debugK) {
      // Auto-find the crossing words so the shared center cell shows every color
      words.filter((w) => w.seed).forEach((w) => submit(w.cells[0], w.cells[w.cells.length - 1], true));
      note = "Debug: " + debugK + " words cross at the center cell and are already found. The topic filter is ignored.";
    }
    if (DEBUG) note += (note ? " " : "") + "Blocklist rerolled " + filled.rerolls + " filler letter(s).";
    noteEl.textContent = note;
  }

  // ---------- Rendering ----------
  function renderGrid() {
    gridEl.innerHTML = "";
    gridEl.style.setProperty("--n", size);
    cellEls = [];
    for (let r = 0; r < size; r++) {
      const row = document.createElement("div");
      row.setAttribute("role", "row");
      const rowEls = [];
      for (let c = 0; c < size; c++) {
        const d = document.createElement("div");
        d.className = "cell";
        d.id = "cell-" + r + "-" + c;
        d.setAttribute("role", "gridcell");
        d.dataset.r = r; d.dataset.c = c;
        d.textContent = letters[r][c];
        d.setAttribute("aria-label", "Row " + (r + 1) + ", column " + (c + 1) + ", " + letters[r][c]);
        row.appendChild(d);
        rowEls.push(d);
      }
      gridEl.appendChild(row);
      cellEls.push(rowEls);
    }
    sizeFont();
    paint();
  }

  function renderClues() {
    cluesEl.innerHTML = "";
    words.forEach((w, i) => {
      const li = el("li", "clue");
      li.id = "clue-" + i;
      const num = el("span", "num", String(i + 1));
      num.setAttribute("aria-hidden", "true");
      const body = el("div");
      body.append(el("span", "term"), el("p", "def", w.clue));
      li.append(num, body);
      cluesEl.appendChild(li);
    });
  }

  function sizeFont() {
    if (!cellEls.length) return;
    const cellPx = gridEl.clientWidth / size;
    gridEl.style.fontSize = Math.max(11, Math.min(28, cellPx * 0.55)) + "px";
  }
  if ("ResizeObserver" in window) new ResizeObserver(sizeFont).observe(gridEl);
  else window.addEventListener("resize", sizeFont);

  // 1 word: solid. 2: split diagonally. 3: three diagonal bands. 4+: quadrants (last 4 words).
  function cellBackground(list) {
    const v = (k) => "var(--hl-" + k + ")";
    if (!list.length) return "";
    if (list.length === 1) return v(list[0]);
    if (list.length === 2) return "linear-gradient(135deg, " + v(list[0]) + " 50%, " + v(list[1]) + " 50%)";
    if (list.length === 3) {
      const [a, b, c] = list;
      return "linear-gradient(135deg, " + v(a) + " 33.3%, " + v(b) + " 33.3%, " + v(b) + " 66.6%, " + v(c) + " 66.6%)";
    }
    const [a, b, c, d] = list.slice(-4);
    return "conic-gradient(" + v(a) + " 0deg 90deg, " + v(b) + " 90deg 180deg, " +
      v(c) + " 180deg 270deg, " + v(d) + " 270deg 360deg)";
  }

  function lineCells(a, b) {
    const dr = b.r - a.r, dc = b.c - a.c;
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    const sr = Math.sign(dr), sc = Math.sign(dc);
    const out = [];
    for (let i = 0; i <= len; i++) out.push({ r: a.r + sr * i, c: a.c + sc * i });
    return out;
  }

  // Redraw highlights. `preview` = cells currently being selected.
  function paint(preview) {
    const sel = new Set((preview || []).map(key));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const e = cellEls[r][c];
        const isSel = sel.has(r + "," + c);
        e.className = "cell";
        e.style.background = isSel ? "" : cellBackground(cellColor[r][c]);
        if (isSel) e.classList.add("sel");
        if (same(pending, { r, c })) e.classList.add("start");
        if (cursor.r === r && cursor.c === c) e.classList.add("cursor");
      }
    }
    gridEl.setAttribute("aria-activedescendant", "cell-" + cursor.r + "-" + cursor.c);
  }

  function previewTo(end) {
    if (!pending) { paint(); return; }
    paint(lineCells(pending, end) || [pending]);
  }

  // ---------- Checking ----------
  function submit(a, b, quiet) {
    const cells = lineCells(a, b);
    if (!cells) { flashWrong([a, b]); return; }
    const str = cells.map((p) => letters[p.r][p.c]).join("");
    const idx = words.findIndex((w) => !w.found && (w.w === str || w.w === rev(str)));
    if (idx === -1) { flashWrong(cells); return; }

    const w = words[idx];
    w.found = true;
    foundCount++;
    const color = (foundCount - 1) % PASTELS + 1;
    cells.forEach((p) => { cellColor[p.r][p.c].push(color); });
    paint();

    const li = $("clue-" + idx);
    li.classList.add("found");
    li.style.background = "var(--hl-" + color + ")";
    li.querySelector(".num").textContent = "✓";
    li.querySelector(".term").textContent = w.term;

    updateProgress();
    if (!quiet) say("Found " + w.term + ".");
    if (foundCount === words.length) finish();
  }

  function flashWrong(cells) {
    paint();
    cells.forEach((p) => { const e = cellEls[p.r][p.c]; e.style.background = ""; e.classList.add("wrong"); });
    say("Not a hidden word. Try again.");
    setTimeout(() => paint(), 450);
  }

  function updateProgress() { foundV.textContent = foundCount + " / " + words.length; }

  function finish() {
    doneText.textContent = "You found all " + words.length + " terms. Review the definitions, then try another puzzle.";
    doneEl.hidden = false;
    say("Puzzle complete! You found all " + words.length + " terms.");
  }

  // ---------- Tap / click selection ----------
  function tap(cell) {
    if (!pending) { pending = cell; paint(); return; }
    if (same(pending, cell)) { pending = null; paint(); return; }
    const p = pending;
    pending = null;
    submit(p, cell);
  }

  // ---------- Pointer (mouse, touch, pen) ----------
  function cellFromPoint(x, y) {
    const e = document.elementFromPoint(x, y);
    const cell = e && e.closest ? e.closest(".cell") : null;
    if (!cell || !gridEl.contains(cell)) return null;
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  }

  gridEl.addEventListener("pointerdown", (e) => {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    gridEl.focus({ preventScroll: true });
    try { gridEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    cursor = cell;
    drag = { start: cell, end: cell, moved: false };
    paint(pending ? (lineCells(pending, cell) || [pending]) : [cell]);
  });

  gridEl.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell || same(cell, drag.end)) return;
    drag.end = cell;
    drag.moved = true;
    cursor = cell;
    paint(lineCells(drag.start, cell) || [drag.start]);
  });

  gridEl.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.moved) {
      pending = null;
      if (same(d.start, d.end)) paint();
      else submit(d.start, d.end);
    } else {
      tap(d.start);
    }
  });

  gridEl.addEventListener("pointercancel", () => { drag = null; paint(); });

  // ---------- Keyboard ----------
  gridEl.addEventListener("keydown", (e) => {
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      cursor = {
        r: Math.min(size - 1, Math.max(0, cursor.r + dr)),
        c: Math.min(size - 1, Math.max(0, cursor.c + dc))
      };
      previewTo(cursor);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap({ r: cursor.r, c: cursor.c });
      if (pending) say("Start letter set. Move to the last letter and press Enter.");
    } else if (e.key === "Escape") {
      pending = null;
      paint();
    }
  });

  // ---------- Start ----------
  if (!TERMS.length || !TOPICS) {
    noteEl.textContent = "The term bank didn't load. Check that shared/data/terms.js and topics.js exist.";
    $("newBtn").disabled = true;
    $("topicsBtn").disabled = true;
    return;
  }
  newPuzzle();
})();
