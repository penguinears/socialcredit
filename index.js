// --- MAIN CLIENT SCRIPT ---

window.onload = function(){

  var firebaseConfig = {
    apiKey: "AIzaSyB5Ok9DqaliIqSTM0EZmXFJSZWWOjCX0aU",
    authDomain: "socialredit.firebaseapp.com",
    databaseURL: "https://socialredit-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "socialredit",
    storageBucket: "socialredit.appspot.com",
    appId: "1:664078097505:web:f9a4e3211f581d37441e20"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  var db = firebase.database();

  class SOCIAL_CREDIT {

    /* TAG DEFINITIONS (GLOBAL SCORE) */
    getAllTags(){
      return [
        { name: "Untrusty",        min: 15, direction: "down" },
        { name: "Unpopular",       min: 20, direction: "down" },
        { name: "Chud",            min: 28, direction: "down" },

        { name: "Mogger",          min: 35, direction: "up" },
        { name: "Cool",            min: 37, direction: "up" },
        { name: "Popular",         min: 40, direction: "up" },
        { name: "Trustworthy Guy", min: 45, direction: "up" },
        { name: "Warlord",         min: 60, direction: "up" },
        { name: "Supreme Leader",  min: 100, direction: "up" }
      ];
    }

    hasUnlockedTag(score, tag){
      if(tag.direction === "down"){
        return score <= tag.min;
      }
      if(tag.direction === "up"){
        return score >= tag.min;
      }
      return false;
    }

    getUnlockedTags(score){
      return this.getAllTags().filter(t => this.hasUnlockedTag(score, t));
    }

    getDefaultTag(score){
      let unlocked = this.getUnlockedTags(score);
      if(unlocked.length === 0) return "";
      return unlocked[unlocked.length - 1].name;
    }

    /* SWEAR FILTER */
    getBannedWords(){
      // Extend this with racist / homophobic slurs you want blocked.
      return [
        "cunt"
      ];
    }

    containsBannedWord(text){
      if(!text) return false;
      const lower = text.toLowerCase();
      const banned = this.getBannedWords();
      return banned.some(w => lower.includes(w));
    }

    /* GLOBAL SCORE HELPERS */
    getGlobalScoreRef(name){
      return db.ref("scores/" + name);
    }

    adjustScore(name, delta, callback){
      let ref = this.getGlobalScoreRef(name);
      ref.transaction(c => {
        if(!c) c = { score: 30 };
        c.score += delta;
        if(c.score < 0) c.score = 0;
        return c;
      }, (err, committed, snap) => {
        if(callback) callback(snap && snap.val() ? snap.val().score : 0);
      });
    }

    /* BANNER SYSTEM */
    showBanner(msg){
      let b = document.getElementById("banner");

      if(!b){
        b = document.createElement("div");
        b.id = "banner";
        document.body.appendChild(b);
      }

      b.style.position = "fixed";
      b.style.left = "0";
      b.style.top = "-60px";
      b.style.width = "100%";
      b.style.padding = "15px";
      b.style.fontWeight = "bold";
      b.style.fontFamily = "Varela Round, sans-serif";
      b.style.textAlign = "center";
      b.style.transition = "top 0.2s ease";
      b.style.borderBottom = "4px solid #000";
      b.style.borderRadius = "0";
      b.style.letterSpacing = "1px";
      b.style.textTransform = "uppercase";

      if(msg.includes("10 minutes")){
        b.style.background = "#ff2222";
        b.style.color = "#ffffff";
      } else {
        b.style.background = "#ffd700";
        b.style.color = "#b30000";
      }

      b.textContent = msg;

      b.classList.remove("shake");
      void b.offsetWidth;
      b.classList.add("shake");

      b.style.top = "0px";

      setTimeout(()=>{
        b.style.top = "-60px";
      }, 6000);
    }

    home(){
      document.body.innerHTML="";
      this.title();
      this.join();
    }

    title(){
      let t=document.createElement("div");
      t.id="title_container";
      let h=document.createElement("h1");
      h.id="title";
      h.textContent="Social Credit – the new kind of social media!";
      t.append(h);
      document.body.append(t);
    }

    join(){
      document.body.innerHTML = "";
      this.title();

      let c=document.createElement("div");
      c.id="join_container";
      let i=document.createElement("input");
      i.placeholder="Enter username";
      let b=document.createElement("button");
      b.textContent="Join";

      b.onclick=()=>{
        if(i.value.length>0){
          localStorage.setItem("name",i.value);
          localStorage.setItem("room","General");
          this.ensureGlobalScore(i.value, () => this.chat());
        }
      };

      let w=document.createElement("div");
      w.id="join_inner_container";
      w.append(i,b);
      c.append(w);
      document.body.append(c);
    }

    ensureGlobalScore(name, cb){
      let ref = this.getGlobalScoreRef(name);
      ref.once("value", v => {
        if(!v.exists()){
          ref.set({ score: 30 }, cb);
        } else {
          cb();
        }
      });
    }

    /* ROOMS (BUILT-IN + USER-CREATED) */
    getRoomsRef(){
      return db.ref("rooms");
    }

    getBuiltInRooms(){
      return ["General","Conspiracy Theories","Politics","Gaming","Debate"];
    }

    loadRooms(callback){
      this.getRoomsRef().once("value", snap => {
        let builtIn = this.getBuiltInRooms();
        let userRooms = [];

        if(snap.exists()){
          snap.forEach(child => {
            const name = child.key;
            const data = child.val() || {};
            if(builtIn.includes(name)){
              // ensure built-ins exist with flag
              if(data.createdByUser !== false){
                this.getRoomsRef().child(name).update({ createdByUser: false });
              }
            } else {
              userRooms.push(name);
            }
          });
        }

        // ensure built-ins exist
        builtIn.forEach(r => {
          this.getRoomsRef().child(r).once("value", s => {
            if(!s.exists()){
              this.getRoomsRef().child(r).set({
                created: Date.now(),
                createdByUser: false
              });
            }
          });
        });

        const all = [...builtIn, ...userRooms];
        callback(all);
      });
    }

    chat(){
      document.body.innerHTML="";
      this.title();

      let controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.alignItems = "center";
      controls.style.margin = "10px auto";
      controls.style.width = "420px";

      let roomWrap = document.createElement("div");
      roomWrap.style.display = "flex";
      roomWrap.style.alignItems = "center";
      roomWrap.style.gap = "6px";

      let roomLabel = document.createElement("span");
      roomLabel.textContent = "Room:";
      roomLabel.style.color = "#ffd700";

      let roomSelect = document.createElement("select");
      roomSelect.style.padding = "6px";
      roomSelect.style.background = "#8b0000";
      roomSelect.style.color = "#ffd700";
      roomSelect.style.border = "2px solid #ffd700";
      roomSelect.style.fontFamily = "Varela Round, sans-serif";

      let createBtn = document.createElement("button");
      createBtn.id = "create_room_button";
      createBtn.textContent = "Create Room";
      createBtn.style.marginLeft = "8px";
      createBtn.style.marginTop = "0";

      roomWrap.append(roomLabel, roomSelect, createBtn);

      let meBtn = document.createElement("button");
      meBtn.textContent = "ME";
      meBtn.style.width = "80px";
      meBtn.style.marginTop = "0";
      meBtn.onclick = () => this.showMePanel();

      controls.append(roomWrap, meBtn);
      document.body.append(controls);

      let c=document.createElement("div");
      c.id="chat_container";
      let inner=document.createElement("div");
      inner.id="chat_inner_container";

      let box=document.createElement("div");
      box.id="chat_content_container";

      let input=document.createElement("input");
      input.placeholder="Say something...";

      let send=document.createElement("button");
      send.textContent="Send";

      inner.append(box,input,send);
      c.append(inner);
      document.body.append(c);

      this.loadRooms(rooms => {
        let currentRoom = localStorage.getItem("room") || "General";
        roomSelect.innerHTML = "";
        rooms.forEach(r=>{
          let opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          if(r === currentRoom) opt.selected = true;
          roomSelect.append(opt);
        });

        roomSelect.onchange = () => {
          localStorage.setItem("room", roomSelect.value);
          this.chat();
        };

        createBtn.onclick = () => this.createRoomPrompt();

        this.setupChatControls(input, send);
        this.listen();
      });
    }

    createRoomPrompt(){
      let name = prompt("Enter new room name:");
      if(!name) return;

      name = name.trim();
      if(name.length < 2){
        this.showBanner("Room name too short.");
        return;
      }

      if(this.containsBannedWord(name)){
        let user = this.get_name();
        let room = localStorage.getItem("room") || "General";
        this.adjustScore(user, -3, newScore => {
          db.ref("rooms/"+room+"/chats").push({
            name: "SYSTEM",
            message: user + " tried to create a bad room name and lost 3 social credit.",
            time: Date.now()
          });
          this.showBanner("Room name not allowed. -3 social credit.");
          if(newScore <= 0){
            this.showBanner("Your social credit is too low to participate.");
          }
        });
        return;
      }

      let user = this.get_name();
      this.getGlobalScoreRef(user).once("value", v => {
        let score = v.val() ? v.val().score : 30;
        if(score <= 0){
          this.showBanner("Your social credit is too low to create rooms.");
          return;
        }

        let ref = this.getRoomsRef().child(name);
        ref.once("value", snap => {
          if(snap.exists()){
            this.showBanner("Room already exists.");
          } else {
            ref.set({ created: Date.now(), createdByUser: true }, () => {
              localStorage.setItem("room", name);
              this.chat();
            });
          }
        });
      });
    }

    setupChatControls(input, send){
      let user = this.get_name();

      this.getGlobalScoreRef(user).once("value", v => {
        let score = v.val() ? v.val().score : 30;

        if(score <= 0){
          input.disabled = true;
          send.disabled = true;
          input.placeholder = "🔒";
          input.style.textAlign = "center";
          input.style.fontSize = "22px";

          let createBtn = document.querySelector("#create_room_button");
          if(createBtn){
            createBtn.disabled = true;
            createBtn.style.opacity = "0.5";
          }

          this.showBanner("Your social credit is too low to participate.");
        } else {
          input.disabled = false;
          send.disabled = false;
          input.placeholder = "Say something...";
          input.style.textAlign = "left";
          input.style.fontSize = "16px";

          let createBtn = document.querySelector("#create_room_button");
          if(createBtn){
            createBtn.disabled = false;
            createBtn.style.opacity = "1";
          }
        }
      });

      send.onclick = () => {
        let room = localStorage.getItem("room") || "General";
        let name = this.get_name();
        if(!name) return;

        this.getGlobalScoreRef(name).once("value", v => {
          let score = v.val() ? v.val().score : 30;

          if(score <= 0){
            this.showBanner("Your social credit is too low to participate.");
            return;
          }

          let text = input.value.trim();
          if(text.length === 0) return;

          if(this.containsBannedWord(text)){
            this.adjustScore(name, -3, newScore => {
              db.ref("rooms/"+room+"/chats").push({
                name: "SYSTEM",
                message: name + " used banned language and lost 3 social credit.",
                time: Date.now()
              });

              this.showBanner("Banned language detected. -3 social credit.");

              if(newScore <= 0){
                input.disabled = true;
                send.disabled = true;
                input.placeholder = "🔒";
                input.style.textAlign = "center";
                input.style.fontSize = "22px";

                let createBtn = document.querySelector("#create_room_button");
                if(createBtn){
                  createBtn.disabled = true;
                  createBtn.style.opacity = "0.5";
                }
              }
            });

            input.value = "";
            return;
          }

          db.ref("rooms/"+room+"/chats").push({
            name: name,
            message: text,
            time: Date.now()
          });

          input.value = "";
        });
      };
    }

    get_name(){
      return localStorage.getItem("name");
    }

    showMePanel(){
      let existing = document.getElementById("me_panel");
      if(existing) existing.remove();

      let name = this.get_name();
      if(!name){
        this.showBanner("No username set.");
        return;
      }

      let panel = document.createElement("div");
      panel.id = "me_panel";
      panel.style.position = "fixed";
      panel.style.top = "70px";
      panel.style.right = "10px";
      panel.style.width = "260px";
      panel.style.background = "#330000";
      panel.style.border = "3px solid #ffd700";
      panel.style.padding = "10px";
      panel.style.color = "#ffd700";
      panel.style.fontFamily = "Varela Round, sans-serif";
      panel.style.zIndex = "9999";

      let title = document.createElement("div");
      title.textContent = "Your Titles (Global)";
      title.style.fontWeight = "bold";
      title.style.marginBottom = "6px";

      let close = document.createElement("div");
      close.textContent = "X";
      close.style.position = "absolute";
      close.style.top = "4px";
      close.style.right = "6px";
      close.style.cursor = "pointer";
      close.onclick = ()=>panel.remove();

      let list = document.createElement("div");
      list.style.maxHeight = "200px";
      list.style.overflowY = "auto";
      list.style.fontSize = "13px";

      panel.append(title, close, list);
      document.body.append(panel);

      let scoreRef = this.getGlobalScoreRef(name);
      let tagRef   = db.ref("tags/"+name);

      scoreRef.once("value", v=>{
        let score = v.val() ? v.val().score : 30;

        tagRef.once("value", tv=>{
          let equipped = tv.val() || "";

          let scoreLine = document.createElement("div");
          scoreLine.textContent = "Score: "+score;
          scoreLine.style.marginBottom = "6px";
          list.append(scoreLine);

          let all = this.getAllTags();
          all.forEach(t=>{
            let row = document.createElement("div");
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.marginBottom = "4px";

            let left = document.createElement("span");
            let isUnlocked = this.hasUnlockedTag(score, t);
            left.textContent = t.name + " (milestone: "+t.min+")" + (isUnlocked ? "" : " [LOCKED]");
            left.style.color = isUnlocked ? "#ffd700" : "#aa5555";

            let btn = document.createElement("button");
            btn.style.padding = "2px 6px";
            btn.style.fontSize = "11px";
            btn.style.marginTop = "0";

            if(score <= 0){
              btn.textContent = "Locked";
              btn.disabled = true;
            } else if(!isUnlocked){
              btn.textContent = "Locked";
              btn.disabled = true;
            } else if(equipped === t.name){
              btn.textContent = "Unequip";
              btn.onclick = ()=>{
                tagRef.remove();
                this.showBanner("Unequipped "+t.name);
                panel.remove();
              };
            } else {
              btn.textContent = "Equip";
              btn.onclick = ()=>{
                tagRef.set(t.name);
                this.showBanner("Equipped "+t.name);
                panel.remove();
              };
            }

            row.append(left, btn);
            list.append(row);
          });
        });
      });
    }

    listen(){
      let room = localStorage.getItem("room") || "General";
      let box=document.getElementById("chat_content_container");

      db.ref("rooms/"+room+"/chats")
        .orderByChild("time")
        .on("value",snap=>{
          box.innerHTML="";
          snap.forEach(s=>{
            let d=s.val();

            let row=document.createElement("div");
            row.className="message_container";

            let nameSpan=document.createElement("span");
            nameSpan.textContent=d.name+" ";

            let scoreSpan=document.createElement("span");
            scoreSpan.className="score";

            let up=document.createElement("span");
            up.textContent="▲";
            up.className="vote";

            let down=document.createElement("span");
            down.textContent="▼";
            down.className="vote";

            let tagSpan=document.createElement("span");
            tagSpan.className="tag";
            tagSpan.style.marginLeft = "4px";
            tagSpan.style.color = "#ccaa33";
            tagSpan.style.fontStyle = "italic";

            let msg=document.createElement("div");
            msg.textContent=d.message;

            if(d.name === "SYSTEM"){
              nameSpan.classList.add("system-name");
              msg.classList.add("system-msg");
              up.style.display = "none";
              down.style.display = "none";
              scoreSpan.style.display = "none";
              tagSpan.style.display = "none";
            } else {
              let scoreRef = this.getGlobalScoreRef(d.name);
              let tagRef   = db.ref("tags/"+d.name);

              scoreRef.once("value", v=>{
                let scoreVal = v.val() ? v.val().score : 30;
                scoreSpan.textContent = scoreVal + " ";

                tagRef.once("value", tv=>{
                  let equipped = tv.val();
                  let tagToShow = equipped || this.getDefaultTag(scoreVal);
                  tagSpan.textContent = tagToShow ? "["+tagToShow+"]" : "";
                });
              });

              up.onclick=()=>this.vote(d.name,1);
              down.onclick=()=>this.vote(d.name,-1);
            }

            row.append(nameSpan,scoreSpan,up,down,tagSpan,msg);
            box.append(row);
          });

          box.scrollTop = box.scrollHeight;
        });
    }

    vote(target,delta){
      let voter=this.get_name();
      let room = localStorage.getItem("room") || "General";
      let now=Date.now();

      if(!voter || voter === target) return;

      this.getGlobalScoreRef(voter).once("value", v => {
        let voterScore = v.val() ? v.val().score : 30;
        if(voterScore <= 0){
          this.showBanner("Your social credit is too low to participate.");
          return;
        }

        let ref=db.ref("votes/"+target+"/"+voter);

        ref.once("value",s=>{

          if(s.exists() && now - s.val() < 600000){
            this.showBanner("You can only vote every 10 minutes.");
            return;
          }

          this.adjustScore(target, delta, () => {});

          ref.set(now);

          db.ref("rooms/"+room+"/chats").push({
            name:"SYSTEM",
            message: voter + " voted " + target + (delta > 0 ? " ↑" : " ↓"),
            time:Date.now()
          });

          this.showBanner("Vote recorded!");
        });
      });
    }
  }

  let app=new SOCIAL_CREDIT();
  if(app.get_name()){
    app.ensureGlobalScore(app.get_name(), () => {
      if(!localStorage.getItem("room")) localStorage.setItem("room","General");
      app.chat();
    });
  } else {
    app.home();
  }
};
