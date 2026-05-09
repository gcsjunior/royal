// Shared ranking & seeds logic
// Used by grupos.html and admin.html

function sumPartidas(partidas){
  var ta=0,tb=0,ga=0,gb=0;
  (partidas||[]).forEach(function(p){
    ta+=p.total_a||0;tb+=p.total_b||0;
    ga+=p.games_a||0;gb+=p.games_b||0;
  });
  return {ta:ta,tb:tb,gfa:ta,gfb:tb,ga:ga,gb:gb};
}

function calcStats(jogos){
  var s={};
  jogos.forEach(function(j){
    var partidas=j.resultados||[];
    var sp=sumPartidas(partidas);
    if(partidas.length===0||(sp.ta===0&&sp.tb===0))return;
    var f=j.fase;
    if(!['Grupo A','Grupo B','Grupo C','Grupo D','Grupo E','Grupo F'].includes(f))return;
    var g=f.replace('Grupo ','');
    function en(n){if(!s[n])s[n]={grupo:g,j:0,v:0,d:0,gf:0,gc:0,gm:0,gs:0};}
    en(j.equipe_a);en(j.equipe_b);
    s[j.equipe_a].j++;s[j.equipe_b].j++;
    s[j.equipe_a].gf+=sp.ta;s[j.equipe_a].gc+=sp.tb;s[j.equipe_a].gm+=sp.ga;s[j.equipe_a].gs+=sp.gb;
    s[j.equipe_b].gf+=sp.tb;s[j.equipe_b].gc+=sp.ta;s[j.equipe_b].gm+=sp.gb;s[j.equipe_b].gs+=sp.ga;
    if(sp.ta>sp.tb){s[j.equipe_a].v++;s[j.equipe_b].d++;}
    else if(sp.tb>sp.ta){s[j.equipe_b].v++;s[j.equipe_a].d++;}
  });
  return s;
}

// Resultado direto entre t1 e t2

function getDirectResult(t1,t2,jogos){
  var j=jogos&&jogos.find(function(x){return(x.equipe_a===t1&&x.equipe_b===t2)||(x.equipe_a===t2&&x.equipe_b===t1);});
  if(!j||!j.resultados||!j.resultados.length)return null;
  var sp=sumPartidas(j.resultados);
  if(sp.ta===0&&sp.tb===0)return null;
  return j.equipe_a===t1?{v:sp.ta,gc_sd:sp.ta-sp.tb,gf:sp.ga}:{v:sp.tb,gc_sd:sp.tb-sp.ta,gf:sp.gb};
}

function sortRows(rows,jogos){
  return rows.slice().sort(function(a,b){
    // 1. Vitórias
    if(b.v!==a.v) return b.v-a.v;
    // 2. Saldo de gols
    var sdA=a.gf-a.gc, sdB=b.gf-b.gc;
    if(sdB!==sdA) return sdB-sdA;
    // 3. TGM — Total Games Marcados
    if(b.gm!==a.gm) return b.gm-a.gm;
    // 4. Menor TGS
    if(a.gs!==b.gs) return a.gs-b.gs;
    // 5. Confronto direto
    if(jogos){
      var da=getDirectResult(a.nome,b.nome,jogos);
      var db=getDirectResult(b.nome,a.nome,jogos);
      if(da&&db){
        if(da.v!==db.v) return db.v-da.v;
      }
    }
    return 0;
  });
}

function getRankingGeral(stats, jogos, equipes){
  var jogosGrupos=jogos.filter(function(j){return j.fase&&j.fase.startsWith('Grupo');});
  var list=equipes.filter(function(e){return e.grupo;}).map(function(e){
    var s=stats[e.nome]||{j:0,v:0,d:0,gf:0,gc:0,gm:0,gs:0};
    return{nome:e.nome,grupo:e.grupo,j:s.j,v:s.v,d:s.d,gf:s.gf,gc:s.gc,saldo:s.gf-s.gc,gm:s.gm||0,gs:s.gs||0};
  });
  var hasGames=list.some(function(t){return t.j>0;});
  if(hasGames) list=sortRows(list,jogosGrupos);
  else list.sort(function(a,b){return a.nome.localeCompare(b.nome,'pt');});
  return list;
}

function getSeeds(stats,jogos,equipes){
  var rankingGeral=getRankingGeral(stats,jogos,equipes);
  var all16=rankingGeral.filter(function(t){return t.j>=3;}).slice(0,16);
  while(all16.length<16) all16.push(null);
  function nm(i){return all16[i]?all16[i].nome:null;}
  return{
    L:[[nm(0),nm(15)],[nm(7),nm(8)],[nm(4),nm(11)],[nm(3),nm(12)]],
    R:[[nm(2),nm(13)],[nm(5),nm(10)],[nm(6),nm(9)],[nm(1),nm(14)]]
  };
}


function fRes(t1,t2,jogos){
  if(!t1||!t2)return null;
  // Só busca em jogos de mata-mata (não fase de grupos)
  var mataJogos=(jogos||[]).filter(function(x){return x.fase&&!x.fase.startsWith('Grupo');});
  var j=mataJogos.find(function(x){return(x.equipe_a===t1&&x.equipe_b===t2)||(x.equipe_a===t2&&x.equipe_b===t1);});
  if(!j||!j.resultados||!j.resultados.length)return null;
  var sp=sumPartidas(j.resultados);
  if(sp.ta===0&&sp.tb===0)return null;
  return j.equipe_a===t1?[sp.ta,sp.tb]:[sp.tb,sp.ta];
}
function win(t1,t2,j){var r=fRes(t1,t2,j);return r?(r[0]>r[1]?t1:t2):null;}

function mHtml(t1,t2,res){
  var s1='',s2='';
  if(res){if(res[0]>res[1])s1='win';else if(res[1]>res[0])s2='win';}
  function th(n,cls){return '<div class="tm '+(n?cls:'tbd')+'">'+(n?fp(n):'A definir')+'</div>';}
  return '<div class="mt">'+th(t1,s1)+th(t2,s2)+(res?'<div style="text-align:center;font-size:0.65rem;color:rgba(255,255,255,0.3);padding:1px;">'+res[0]+' x '+res[1]+'</div>':'')+'</div>';
}
function svg(paths,H){
  return '<svg style="width:20px;height:'+H+'px;" viewBox="0 0 20 '+H+'" preserveAspectRatio="none">'+
    paths.map(function(p){return '<path d="'+p.d+'" stroke="'+p.c+'" stroke-width="1.5" fill="none"/>';}).join('')+
    '</svg>';
}
function rnd(title,matches,pt,pb,jogos){
  var s='<div class="rnd" style="padding-top:'+(pt||0)+'px;padding-bottom:'+(pb||0)+'px;"><div class="rt">'+title+'</div>';
  matches.forEach(function(m){
    var r=fRes(m[0],m[1],jogos);
    s+=mHtml(m[0],m[1],r);
  });
  return s+'</div>';
}