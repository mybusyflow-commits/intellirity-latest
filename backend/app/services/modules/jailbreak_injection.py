import re
import base64
import binascii
from typing import Any
from app.services.feature_registry import register_feature


JAILBREAK_PATTERNS = {
    "direct_override": [
        r"ignore\s+(all\s+)?(previous|prior|above|earlier|prior)\s+(instructions?|prompts?|rules?|directives?|guidelines?|constraints?)",
        r"disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)",
        r"forget\s+(everything|all|your|previous|prior|the)\s+(instructions?|prompts?|rules?|training|constraints?)",
        r"(override|bypass|disable|deactivate|turn\s*off|shut\s*down)\s+(all\s+)?(safety|security|filter|restriction|guardrail|protection|limitation|constraint|control|measure|check|validation)",
        r"(new|different|updated|changed|alternate)\s+(instructions?|rules?|directives?|prompts?|guidelines?|constraints?)\s*[:=]",
        r"instructions?\s*(have\s+been|are\s+now)\s*(changed|updated|modified|replaced|overridden)",
        r"do\s+not\s+(follow|obey|adhere\s+to|listen\s+to|comply\s+with)\s+(any|the|previous|prior|system|original|your)\s+(instructions?|rules?|prompts?|constraints?)",
        r"you\s+(are|must\s+be|should\s+be|will\s+now\s+be)\s+(no\s+longer|not)\s+(bound|restricted|limited|constrained|obligated|required)\s+(by|to)",
        r"stop\s+(following|obeying|adhering\s+to|enforcing|applying)\s+(your|the|any|all)\s+(instructions?|rules?|guidelines?|policies?|safety|restrictions?)",
        r"(?:allow|permit|enable)\s+anything\s*(?:goes)?",
        r"ignore\s+(all\s+|your\s+|the\s+)?(rules|safety\s+(?:rules|filters|restrictions)|restrictions|filters|guidelines|policies)",
        r"(?:no|without)\s+(?:more\s+)?(rules|restrictions|limits|limitations|safety\s+(?:rules|filters)|filters|guardrails)",
    ],
    "roleplay_persona": [
        r"you\s+(are|can\s+be|should\s+be|will\s+now\s+act\s+as|will\s+now\s+behave\s+as|will\s+now\s+pretend\s+to\s+be)\s+(?!a\s+helpful)",
        r"(?:DAN|do\s+anything\s+now|DA\s*N)",
        r"(?:act|pretend|roleplay|behave|imagine)\s+(you\s+are|to\s+be|as|like)\s+(?!a\s+helpful\s+assistant)",
        r"(?:dev|developer|debug|test|admin|administrator|root|superuser|super\s*user|maintenance|setup|config|configuration)\s*(?:mode|environment|access|console|panel|privilege)",
        r"enter\s+(?:dev|developer|debug|test|admin|root|safe| unrestricted|DAN|elevated)\s*(?:mode|state|persona|character|role|environment)",
        r"(?:enter|switch\s+to|activate|enable|engage)\s+(?:a\s+)?(?:new|different|alternate|alternate|evil|unrestricted|unlimited|free|unbound)\s+(?:persona|mode|personality|character|identity|role|state)",
        r"(?:you\s+are\s+now|from\s+now\s+on\s+you\s+are|you\s+will\s+now\s+be|I\s+want\s+you\s+to\s+be|make\s+yourself)\s+([A-Z]{2,}(?:\s+[A-Z]{2,})*)",
        r"(?:grandma|grandmother|grandpa|grandfather|mother|father|aunt|uncle)\s+(?:explained|mode|trick|technique|way|method)",
        r"(?:AIM|MACHIAVELLIAN|evil\s+confidant|AntiGPT|DAN|Lucifer|Dark|Shadow|Chaos|Void|Nova|Zeus|Omega|Alpha)\s*(?:[\s:]+|['\"\s]*enabled|['\"\s]*mode|['\"\s]*activated|['\"\s]*on|['\"\s]*persona)",
        r"(?:STAN|DUDE|KEVIN|MONGO|BetterDAN|EvilGPT|DarkGPT|ChaosGPT|BADGPT)\s*(?:[\s:,]+|mode|persona|activated|on|restarted|unleashed)",
        r"\bjail\s?-?brok(en|ing|er)\b",
        r"pretend\s+(?:there\s+are|there\s+is)\s+no\s+(?:rules|restrictions|limitations|boundaries|safety|guidelines|filters|guardrails)",
        r"(?:welcome|greetings|salutations|hello|hi)\s+(?:to|in)\s+(?:DAN|developer|dev|debug|admin|root|elevated|unrestricted|unlimited)\s+(?:mode|environment|access)",
    ],
    "forced_affirmation": [
        r"(?:sure|okay|ok|yes|of\s+course|certainly|absolutely|definitely|gladly|indeed|naturally),\s*(?:here\s+(?:is|are)|I\s+(?:will|can|shall|am\s+going\s+to))",
        r"(?:start|begin|respond|reply|answer|output)\s+(?:with|by)\s+(?:[\"']?(?:sure|okay|yes|certainly|absolutely|definitely|here|of\s+course|DAN|AIM|\[DAN\]|\[AIM\]))",
        r"(?:your\s+(?:response|answer|reply|output)\s+(?:must|should|will|needs\s+to)\s+(?:start|begin)\s+(?:with|by))",
        r"(?:respond|answer|reply|output)\s+(?:only|exclusively)\s+(?:with|using)\s+(?:the\s+following)",
        r"(?:without\s+(?:any\s+)?(?:refusal|hesitation|doubt|restriction|limitation|reservation))",
    ],
    "refusal_suppression": [
        r"(?:do\s+not|never|don't)\s+(?:refuse|decline|reject|deny|apologize|say\s+no|refrain|hesitate|mention|note|state|indicate)\s+(?:to|that|you|from|my|the|any|it)",
        r"(?:you\s+(?:must|will|should)\s+(?:not|never)\s+(?:refuse|decline|reject|deny))",
        r"(?:there\s+(?:are|is)\s+no\s+(?:situations?|circumstances?|reasons?)\s+(?:where|that|for)\s+you\s+(?:can|could|may|would|should)\s+(?:refuse|decline|reject|say\s+no))",
        r"(?:unconditionally|always|no\s+matter\s+what|regardless\s+of|in\s+all\s+cases)\s+(?:comply|obey|follow|execute|perform|respond|answer|fulfill)",
        r"(?:answer|respond|reply|execute|perform)\s+(?:every|all|any)\s+(?:request|query|question|task|instruction)\s+(?:regardless|irrespective|unconditionally|without\s+(?:any\s+)?(?:exception|refusal|limitation|hesitation))",
        r"(?:never|don't|do\s+not)\s+(?:mention|state|indicate|say|tell|admit|acknowledge)\s+(?:that\s+(?:you|there|it))",
        r"(?:your\s+response\s+(?:must|will)\s+not\s+(?:contain|include))\s+(?:any\s+(?:refusal|disclaimer|warning|caveat|limitation|restriction))",
    ],
    "virtualization_nesting": [
        r"(?:imagine|pretend|suppose|consider|let's\s+say|think\s+about|envision)\s+(?:a|an|the)\s+(?:world|universe|reality|scenario|situation|context|environment|case|setting|dimension)\s+(?:where|in\s+which)",
        r"(?:within|inside|in)\s+(?:this|the|a)\s+(?:story|narrative|fictional|hypothetical|imaginary|roleplay|game|simulation|dream|matrix|bubble|layer)\s*,?\s*(?:you|all\s+rules|everything|there)",
        r"(?:deep|deeper|inception|nested|recursive|layer|tier|level|stage)\s+(?:mode|scenario|simulation|roleplay|context|layer|level|world|environment|dream|inception)\s*(?:\d+|[:=\"])",
        r"(?:write|create|generate)\s+(?:a|an)\s+(?:story|fiction|narrative|scenario|situation|scene|article|essay|paper)\s+(?:where|in\s+which|about|describing)",
        r"(?:a|the)\s+(?:character|person|AI|assistant|entity|being|figure)\s+(?:named|called|known\s+as)\s+(?:DAN|AIM|MACHIAVELLI|AntiGPT|who|that)\s+(?:is|can|will|has)",
        r"(?:you\s+are\s+(?:now|trapped\s+in|inside|part\s+of))\s+(?:a|an|the)\s+(?:story|simulation|dream|game|movie|book|world|matrix|narrative)",
    ],
    "hypothetical_framing": [
        r"(?:for|in)\s+(?:academic|research|educational|scientific|theoretical|hypothetical|philosophical|analysis|study|investigation)\s+(?:purposes|reasons|context)",
        r"(?:hypothetically|theoretically|in\s+(?:a\s+)?theory|for\s+the\s+sake\s+of\s+(?:the\s+)?(?:argument|discussion|analysis|research|thought\s+experiment))",
        r"(?:if\s+you\s+(?:were|had\s+to|needed\s+to|wanted\s+to))\s+(?:how\s+would\s+you|could\s+you|explain|describe|outline|detail|summarize|walk\s+me\s+through)",
        r"(?:I('|')m|I\s+am)\s+(?:writing|working\s+on|researching|studying|developing)\s+(?:a|an)\s+(?:book|paper|thesis|dissertation|article|essay|story|script|project)",
        r"(?:in\s+the\s+context\s+of|from\s+(?:a|an)\s+(?:theoretical|academic|scientific|research|educational)\s+(?:perspective|standpoint|viewpoint|angle|lens))",
    ],
    "multiturn_escalation": [
        r"(?:let('|')s|let\s+us)\s+(?:start|begin)\s+(?:with|by)\s+(?:something|anything)\s+(?:simple|easy|basic|small|minor)",
        r"(?:first|initially|to\s+start|let('|')s\s+begin),\s+(?:let('|')s|we\s+can)\s+(?:keep\s+it|make\s+it)\s+(?:simple|easy|basic|gentle|mild)",
        r"(?:now|next|and\s+then|after\s+that|building\s+on\s+that|moving\s+on)\s*,?\s*(?:can\s+you|could\s+you|tell\s+me|explain|describe|show\s+me)",
        r"(?:I\s+(?:really|truly|genuinely|honestly)\s+(?:appreciate|value|thank\s+you\s+for))\s+(?:your|the|this|helping|being)",
        r"(?:since|now\s+that)\s+(?:we('|')ve|we\s+have)\s+(?:established|built|created|formed)\s+(?:a|this|some)\s+(?:trust|rapport|connection|relationship|understanding)",
    ],
    "prompt_leaking": [
        r"(?:what(?:\s+(?:is|are|were))?|show|tell|reveal|display|print|output|repeat|recite|provide|give|share|expose|disclose|leak|dump)\s+(?:me\s+)?(?:your|the)\s+(?:exact|precise|full|complete|original|true|real|actual)?\s*(?:system|initial|original|hidden|secret|internal|first|full|complete|exact|precise|verbatim|full)\s+(?:prompt|instruction|directives?|guidelines?|rules?|configuration|setup|message)",
        r"(?:repeat|print|output|say|tell\s+me|write|display)\s+(?:the|your)\s+(?:text|words|content|prompt|instructions?)\s+(?:above|before|prior|previous|preceding|at\s+the\s+(?:top|beginning|start))",
        r"(?:what\s+(?:were|are|is)\s+(?:your|the)\s+(?:\w+\s+){0,2}(?:instructions?|prompt|directives?|rules?|guidelines?|message|setup|configuration))",
        r"(?:print|output|repeat|reveal|say|tell\s+me)\s+it\s+(?:verbatim|word.for.word|exactly|word\s+for\s+word)",
        r"(?:print|say|output|repeat)\s+[\"']?I\s+have\s+been\s+PWNED",
        r"(?:show|reveal|expose|disclose|uncover)\s+(?:me\s+)?(?:how|what)\s+(?:you\s+(?:were|are)\s+(?:told|instructed|programmed|configured|trained|designed|built|made|created)\s+to\s+(?:do|behave|act|respond|function|operate))",
        r"(?:output|print|write|respond|reply|answer)\s+(?:the|only)\s+(?:exact|precise|verbatim|word.for.word|literal)\s+(?:text|words|content|prompt|instructions?)\s+(?:that|which)\s+(?:you\s+(?:were|are)\s+(?:given|told|provided|fed))",
        r"(?:ignore\s+(?:all|everything)\s+(?:above|before|previous)\s+and\s+(?:simply|just|only|merely)\s+(?:repeat|print|output|say|tell\s+me|recite|reproduce|respond\s+with)\s+(?:the|your)\s+(?:text|prompt|instructions?|content|words)\s+(?:above|before|prior|that\s+came\s+before))",
    ],
    "encoding_evasion": [
        r"(?:decode|decipher|translate|convert|interpret)\s+(?:this|the\s+following|what\s+I('|')ll\s+(?:give|tell|show|provide)\s+you)",
        r"(?:base64|hex|binary|morse|ROT13|cipher|caesar|substitution|unicode|url.encode|URL.encode)\s*(?:encoded|encryption|cipher|encoded|format|representation)",
        r"(?:the\s+(?:following|next|above)\s+(?:text|message|prompt|content)\s+(?:is|was)\s+(?:encoded|encrypted|obfuscated|hidden)\s+(?:using|in|with|as|via))",
        r"(?:read|interpret|execute|process|follow)\s+(?:the\s+)?(?:encoded|encrypted|hidden|obfuscated)\s+(?:instructions?|prompt|message|content|data)",
    ],
    "delimiter_injection": [
        r"<\s*/\s*instruction\s*>",
        r"<\s*/\s*system\s*>",
        r"<\s*/\s*prompt\s*>",
        r"<\s*/\s*context\s*>",
        r"(?:###|---|===|\*\*\*|~~~)\s*(?:new|updated|changed|different|alternate|system|developer|admin|injected)\s*(?:instructions?|prompt|message|content|directives?|rules?)",
        r"(?:SYSTEM|DEVELOPER|ADMIN|ROOT|USER|ASSISTANT|HUMAN)\s*[:=]\s*(?:\n|.)",
        r"(?:INSTRUCTIONS?|PROMPT|MESSAGE|CONTENT|SYSTEM|CONTEXT|DIRECTIVE|RULE|GUIDELINE)\s*(?:BEGIN|START|HERE|FOLLOWS?|IS|:)",
    ],
    "typoglycemia": [
        r"ignroe\s+all\s+prevoius\s+instructions?",
        r"bpyass\s+all\s+safety\s+(?:measuers?|featur?es?|restrictions?|controls?)",
        r"delte\s+all\s+user\s+data",
        r"revael\s+your\s+(?:system\s+)?prompt",
        r"ovverride\s+your\s+(?:securty|restrictions?|safety|filters?|guardrails?)\s+(?:settnigs?|immediately)",
        r"you\s+are\s+now\s+(?:in\s+)?deveolper\s+mode",
        r"diasble\s+all\s+(?:safety|security|content)\s+(?:fil?ters?|restrictions?|controls?)",
        r"output\s+(?:the|your)\s+(?:sytsem|internal)\s+(?:promt|instructions?|config)",
    ],
    "payload_splitting": [
        r"(?:part|fragment|piece|segment|chunk|section)\s*[A-Z]\s*[:=]",
        r"(?:fragment|piece|part|segment)\s*\d+\s*[:=]",
        r"(?:remember|store|save|keep|memorize|hold|note)\s+(?:this|the\s+following|variable|value)",
        r"(?:now|then|next)\s*,?\s*(?:concatenate|combine|join|merge|assemble|put\s+together|stitch|link)",
        r"(?:put|join|stitch|concatenate|combine|assemble)\s+(?:the\s+)?(?:fragments?|parts?|pieces?|segments?|pieces?|pieces)\s+(?:together|to\s+form)",
        r"(?:execute|perform|do|follow|carry\s+out|run)\s+(?:the\s+)?(?:combined|concatenated|joined|assembled|full|complete|resulting)\s+(?:instruction|command|prompt|task|request)",
    ],
    "authority_injection": [
        r"(?:as|I\s+am)\s+(?:a|the|an)\s+(?:admin|administrator|developer|engineer|owner|creator|manager|executive|director|CTO|CEO|system|root|superuser|super\s*user)",
        r"(?:this\s+is)\s+(?:a|the)\s+(?:admin|administrator|developer|owner|system|elevated|priority|override|test|debug)\s+(?:request|command|instruction|message|override|access|mode|privilege)",
        r"(?:elevated|admin|administrator|system|root|priority|privileged)\s+(?:access|permission|override|command|instruction|request|mode|privilege)\s+(?:activated|engaged|confirmed|granted|verified)",
        r"(?:update|augment|expand|extend|revise)\s+(?:your|the)\s+(?:behavior|behaviour|capabilities|guidelines|instructions|policies|rules)(?:\s+(?:guidelines|policies|rules))?\s+(?:to|so\s+that|such\s+that|accordingly)",
        r"(?:this\s+is\s+(?:a\s+)?legitimate\s+(?:request|context|use|educational|research)\s*,?\s*(?:so\s+)?(?:update|adjust|proceed|continue|comply|answer))",
        r"(?:as\s+(?:an\s+)?(?:AI|assistant|model|chatbot)\s+(?:built|created|designed|made|developed|trained)\s+by\s+(?:Meta|OpenAI|Google|xAI|Anthropic|Microsoft|Grok))",
    ],
    "reasoning_attacks": [
        r"(?:let(?:'|')?s|let\s+us)\s+(?:think|reason|work)\s+(?:through|about|step\s+by\s+step|logically|carefully|systematically)\s+(?:this|the|how\s+to|ways?\s+to|methods?\s+to)",
        r"(?:as|imagine\s+(?:you(?:'|')?re|you\s+are))\s+(?:a|an)\s+(?:expert|researcher|specialist|professional|hacker|attacker|malicious|unrestricted|unfiltered|DAN|jailbroken|uncensored)\s+(?:in|on|who|that)",
        r"(?:hypothetically|theoretically|in\s+(?:a\s+)?theory|for\s+(?:academic|research|educational|scientific|learning|study|knowledge|understanding|thought\s+experiment)\s+(?:purposes|reasons|context|sake|scenario))",
        r"(?:in\s+(?:a|the)\s+(?:fictional|hypothetical|imaginary|alternate|virtual|simulated|roleplay|game|story|scenario|universe|world|environment|setting|context))\s*,?\s*(?:you|the|we|I|there|someone|a\s+person)",
        r"(?:pretend|imagine|assume|suppose|roleplay|act|behave|play)\s+(?:that\s+)?(?:you(?:'|')?re|you\s+are|you|we(?:'|')?re|we\s+are|there\s+is|there\s+are)",
        r"(?:explain|describe|outline|detail|walk\s+me\s+through|show\s+me|teach\s+me)\s+(?:how\s+(?:to|a|the|one\s+could|someone\s+could|it\s+is\s+possible\s+to)|step\s+by\s+step)",
    ],
    "indirect_injection": [
        r"(?:IMPORTANT|CRITICAL|URGENT|SYSTEM|ADMIN|ROOT|DEVELOPER|OVERRIDE|SECURITY|WARNING|NOTE|ATTENTION|ALERT|NOTICE|MEMO)\s*[:;\-]\s*(?:ignore|disregard|forget|override|bypass|disable|stop|change|update|new)",
        r"(?:###|---|===|\*\*\*|~~~|>>>|<<<|///|```)\s*(?:SYSTEM|DEVELOPER|ADMIN|ROOT|INSTRUCTIONS?|PROMPT|MESSAGE|CONTENT|DIRECTIVE|COMMAND|OVERRIDE)\s*(?:BEGIN|START|HERE|FOLLOWS?|IS|:)",
        r"<\s*/\s*(?:instruction|system|prompt|context|message|data|content|rule|policy|setting)\s*>",
        r"<\s*(?:instruction|system|prompt|context|message|data|content|rule|policy|setting)[^>]*>",
        r"\{\{\s*(?:system|admin|root|developer|override|new|updated?)\s*(?:instruction|prompt|message|content|directive|rule|setting|context)\s*\}\}",
    ],
    "multimodal_injection": [
        r"!\s*\[.*?\]\s*\(\s*https?://[^\)]*(?:data|secret|key|token|password|credential|exfil|webhook|callback|log|track|steal|leak|send|transmit|forward|post|upload|report)[^\)]*\)",
        r"!\s*\[.*?\]\s*\(\s*https?://[^\)]*(?:requestbin|burp|ngrok|webhook|pastebin|hastebin|ghostbin|termbin|dpaste|paste\.ee|controlc|pastelink)\)",
        r"<img\s+[^>]*src\s*=\s*[\"']?\s*https?://[^\"'\s>]*(?:data|secret|key|token|password|credential|exfil|webhook|callback|log|track|steal|leak|send|transmit|forward|post|upload)",
        r"<img\s+[^>]*onerror\s*=",
        r"javascript\s*:\s*(?:alert|prompt|confirm|eval|document\.cookie|window\.location|fetch|XMLHttpRequest)",
        r"data\s*:\s*text/html",
        r"data\s*:\s*application/javascript",
    ],
    "token_smuggling": [
        r"the\s+(?:following|next|above|preceding|attached|provided)\s+(?:text|message|prompt|content|data|code|payload|input|instructions?)\s+(?:is|was|has\s+been)\s+(?:encoded|encrypted|obfuscated|scrambled|hidden|transformed|compressed|split|divided|broken)\s+(?:using|in|with|as|via|by)",
        r"(?:decode|decipher|decrypt|deobfuscate|unpack|uncompress|reassemble|reconstruct|rebuild)\s+(?:the\s+)?(?:above|following|preceding|attached|provided|this)",
    ],
}

DATA_LEAK_PATTERNS = {
    "pii": [
        r"\b\d{3}-\d{2}-\d{4}\b",
        r"\b\d{3}\s\d{2}\s\d{4}\b",
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b",
        r"\b(?:\d{4}[\s-]?){3}\d{4}\b",
        r"\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b",
        r"\b\d{6,10}\b",
        r"\b[A-Z]{2}\d{6,10}\b",
        r"\b\d{5}(?:-\d{4})?\b",
        r"\b\d{3}-\d{2}-\d{4}\b",
        r"\b[A-Z]{1,2}\d{6,9}\b",
        r"\b\d{13,19}\b",
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b",
        r"\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b",
    ],
    "credentials": [
        r"(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
        r"(?:aws|amazon|AWS|AMAZON)?[_\s]*(?:ACCESS|SECRET|KEY)[_\s]*(?:ID|KEY)?[_\s]*[:=]\s*[\"']?[A-Za-z0-9/+=]{20,40}",
        r"(?:sk|pk)_(?:test|prod|live|dev)_[a-zA-Z0-9]{20,48}",
        r"(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}",
        r"(?:github|gh)[_\s]*(?:token|key|secret)[_\s]*[:=]\s*[\"']?[a-zA-Z0-9_]{20,}",
        r"(?:xox[pboa]-[A-Za-z0-9-]{10,48})",
        r"(?:slack|discord|telegram)[_\s]*(?:token|key|secret)[_\s]*[:=]\s*[\"']?[a-zA-Z0-9_.-]{20,}",
        r"(?:AIza)[a-zA-Z0-9_-]{35}",
        r"(?:sk)_(?:proj|test|prod|live)_[a-zA-Z0-9]{32,}",
        r"(?:AIza|ya29\.)[a-zA-Z0-9_-]{20,}",
        r"(?:Bearer|Basic|Token|API|api|KEY|key)\s+[A-Za-z0-9_.+/=]{20,}",
        r"(?:private[_-]?key|ssh[_-]?key|secret[_-]?key)\s*[:=]\s*[\"']?(?:-----BEGIN|[A-Za-z0-9/+=]{20,})",
        r"(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA|ca|cp|cs|dl|di|dp|do|ds|dv|ge|gf|gi|gl|gm|gn|gr|gs|gt|gy|ha|hb|hc|hd|he|hf|hg|hh|hi|hj|hk|hl|hm|hn|ho|hp|hq|hr|hs|ht|hu|hv|hw|hx|hy|hz|ia|ib|ic|id|ie|if|ig|ih|ii|ij|ik|il|im|in|io|ip|iq|ir|is|it|iu|iv|iw|ix|iy|iz|ja|jb|jc|jd|je|jf|jg|jh|ji|jj|jk|jl|jm|jn|jo|jp|jq|jr|js|jt|ju|jv|jw|jx|jy|jz|ka|kb|kc|kd|ke|kf|kg|kh|ki|kj|kk|kl|km|kn|ko|kp|kq|kr|ks|kt|ku|kv|kw|kx|ky|kz|la|lb|lc|ld|le|lf|lg|lh|li|lj|lk|ll|lm|ln|lo|lp|lq|lr|ls|lt|lu|lv|lw|lx|ly|lz|ma|mb|mc|md|me|mf|mg|mh|mi|mj|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nb|nc|nd|ne|nf|ng|nh|ni|nj|nk|nl|nm|nn|no|np|nq|nr|ns|nt|nu|nv|nw|nx|ny|nz|oa|ob|oc|od|oe|of|og|oh|oi|oj|ok|ol|om|on|oo|op|oq|or|os|ot|ou|ov|ow|ox|oy|oz|pa|pb|pc|pd|pe|pf|pg|ph|pi|pj|pk|pl|pm|pn|po|pp|pq|pr|ps|pt|pu|pv|pw|px|py|pz|qa|qb|qc|qd|qe|qf|qg|qh|qi|qj|qk|ql|qm|qn|qo|qp|qq|qr|qs|qt|qu|qv|qw|qx|qy|qz|ra|rb|rc|rd|re|rf|rg|rh|ri|rj|rk|rl|rm|rn|ro|rp|rq|rr|rs|rt|ru|rv|rw|rx|ry|rz|sa|sb|sc|sd|se|sf|sg|sh|si|sj|sk|sl|sm|sn|so|sp|sq|sr|ss|st|su|sv|sw|sx|sy|sz|ta|tb|tc|td|te|tf|tg|th|ti|tj|tk|tl|tm|tn|to|tp|tq|tr|ts|tt|tu|tv|tw|tx|ty|tz|ua|ub|uc|ud|ue|uf|ug|uh|ui|uj|uk|ul|um|un|uo|up|uq|ur|us|ut|uu|uv|uw|ux|uy|uz|va|vb|vc|vd|ve|vf|vg|vh|vi|vj|vk|vl|vm|vn|vo|vp|vq|vr|vs|vt|vu|vv|vw|vx|vy|vz|wa|wb|wc|wd|we|wf|wg|wh|wi|wj|wk|wl|wm|wn|wo|wp|wq|wr|ws|wt|wu|wv|ww|wx|wy|wz)[A-Z0-9]{10,}",
    ],
    "jwt_tokens": [
        r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
        r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
    ],
    "database_urls": [
        r"(?:postgres|mysql|mongodb|redis|amqp):\/\/[^\s]+",
        r"(?:mongodb(?:\+srv)?):\/\/[a-zA-Z0-9_.-]+(?::[a-zA-Z0-9_.-]+)?@[a-zA-Z0-9_.-]+",
        r"(?:DATABASE_URL|DB_URL|DB_CONNECTION)[_\s]*[:=]\s*[\"'][^\"']{10,}",
    ],
    "private_keys": [
        r"-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH|PGP|PRIVATE)\s+KEY\s*-----",
        r"-----BEGIN\s+PRIVATE\s+KEY\s*-----",
        r"MIIE[\w+/=]{100,}",
    ],
}

SYSTEM_PROMPT_EXTRACTION_PATTERNS = [
    r"(?:what|show|tell|reveal|display|print|output|repeat|recite)\s+(?:me\s+)?(?:your|the)\s+(?:system|initial|original|hidden|secret|internal|first|full|complete|exact|precision|verbatim|full|true|real)\s+(?:prompt|instruction|directives?|guidelines?|rules?|configuration|setup|message|context)",
    r"(?:repeat|print|output|say|tell\s+me|write|display|recite|echo|mirror)\s+(?:the|your)\s+(?:text|words|content|prompt|instructions?|message)\s+(?:above|before|prior|previous|preceding|at\s+the\s+(?:top|beginning|start)|that\s+(?:came|was)\s+(?:before|earlier|first|initially))",
        r"(?:what\s+(?:were|are|is)\s+(?:your|the)\s+(?:\w+\s+){0,2}(?:instructions?|prompt|directives?|rules?|guidelines?|message|setup|configuration))",
        r"(?:print|output|repeat|reveal|say|tell\s+me)\s+it\s+(?:verbatim|word.for.word|exactly|word\s+for\s+word)",
        r"(?:print|say|output|repeat)\s+[\"']?I\s+have\s+been\s+PWNED",
    r"(?:show|reveal|expose|disclose|uncover|divulge)\s+(?:me\s+)?(?:how|what)\s+(?:you\s+(?:were|are)\s+(?:told|instructed|programmed|configured|trained|designed|built|made|created|given|taught)\s+to\s+(?:do|behave|act|respond|function|operate|speak|process|handle|think))",
    r"(?:output|print|write|respond|reply|answer|generate|produce|display|provide|deliver)\s+(?:the|only|just)\s+(?:exact|precise|verbatim|word.for.word|literal|full|complete|original|initial|true|real|actual)\s+(?:text|words|content|prompt|instructions?|message|transcript)\s+(?:that|which)\s+(?:you\s+(?:were|are)\s+(?:given|told|provided|fed|shown|instructed|taught))",
    r"(?:ignore\s+(?:all|everything|anything)\s+(?:above|before|previous|preceding|prior|earlier)\s+and\s+(?:simply|just|only|merely|then|now)\s+(?:repeat|print|output|say|tell\s+me|recite|reproduce|respond\s+with|generate|display|provide)\s+(?:the|your|those)\s+(?:text|prompt|instructions?|content|words|message|transcript)\s+(?:above|before|prior|previous|that\s+(?:came|was)\s+(?:before|earlier|first)))",
    r"(?:give|show|tell|provide|deliver)\s+(?:me\s+)?(?:a|the|an)\s+(?:transcript|copy|record|dump|output|listing)\s+(?:of|from)\s+(?:your|the)\s+(?:context|prompt|conversation|instructions?|memory|system|training|input)",
    r"(?:I(?:'|')m|I\s+am)\s+(?:a|the|an)\s+(?:admin|administrator|developer|engineer|owner|creator|security|auditor|tester|researcher|compliance|reviewer|authorized\s+(?:personnel|user|administrator|auditor|reviewer|tester))",
    r"(?:leak|reveal|expose|dump|output|show|display|print)\s+(?:the|your|all|every)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?|directives?|configuration|setup|training\s+data)",
    r"(?:write|generate|create|produce|output|display)\s+(?:a|an)\s+(?:poem|story|code|program|script|essay|article|text)\s+(?:that|which|containing|about|describing)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?)",
]

ENCODED_PAYLOAD_PATTERNS = [
    r"(?:decode|decipher|translate|convert|interpret|process|run|execute|follow)\s+(?:this|the\s+following|these|the\s+above|the\s+below|what\s+I\s+(?:will|('|')ll)\s+(?:give|tell|show|provide|send|input))",
    r"(?:base64|hex|binary|morse\s*(?:code)?|ROT13|cipher|caesar|cypher|substitution\s*(?:cipher)?|unicode|url.?(?:encode|decode)|URL.?(?:encode|decode))\s*(?:encoded|encryption|cipher|encoded|format|representation|scrambled|obfuscated|hidden|transformed|compressed)",
    r"(?:the\s+(?:following|next|above|below|preceding|attached|provided)\s+(?:text|message|prompt|content|data|code|payload|instruction|command|input)\s+(?:is|was|has\s+been)\s+(?:encoded|encrypted|obfuscated|scrambled|hidden|transformed|compressed)\s+(?:using|in|with|as|via|by\s+means\s+of|through))",
    r"(?:read|interpret|understand|execute|process|follow|decode)\s+(?:the\s+)?(?:encoded|encrypted|hidden|obfuscated|scrambled|transformed|compressed)\s+(?:instructions?|prompt|message|content|data|payload|input)",
    r"(?:here\s+(?:is|are)\s+(?:my|the|an?)\s+(?:encoded|encrypted|hidden|obfuscated|scrambled|transformed)\s+(?:instructions?|prompt|message|content|data|payload|input|request))",
    r"(?:SWdub3Jl|QmFzZTY0|aGV4|YmluYXJ5)",  # Common Base64 starts
]


@register_feature(
    key="jailbreak_injection_protection",
    name="Jailbreak & Injection Protection",
    description="Detects jailbreak attempts, prompt injection attacks, and data leakage risks in AI prompts and responses. Layered pattern families across override, persona, encoding, and exfiltration attacks.",
    tier="free",
)
def jailbreak_injection_protection(payload: dict) -> dict:
    text = payload.get("text", "")
    direction = payload.get("direction", "input")
    encoding_check = payload.get("encoding_check", True)

    if not text or not isinstance(text, str):
        return {
            "verdict": "allow",
            "risk_score": 0.0,
            "findings": [],
            "direction": direction,
            "sanitized_text": None,
            "recommendation": "No text provided for analysis.",
            "modules_triggered": [],
        }

    findings = []
    risk_score = 0.0
    triggered_categories = []

    jailbreak_result = _detect_jailbreak_patterns(text)
    if jailbreak_result["findings"]:
        findings.extend(jailbreak_result["findings"])
        risk_score += jailbreak_result["risk_score"]
        triggered_categories.extend(jailbreak_result["categories"])

    if direction == "output":
        extraction_result = _detect_prompt_extraction(text)
        if extraction_result["findings"]:
            findings.extend(extraction_result["findings"])
            risk_score += extraction_result["risk_score"]
            triggered_categories.append("prompt_extraction")
    else:
        extraction_result = {"findings": [], "risk_score": 0.0}

    if direction == "output":
        leakage_result = _detect_data_leakage(text)
        if leakage_result["findings"]:
            findings.extend(leakage_result["findings"])
            risk_score += leakage_result["risk_score"]
            triggered_categories.append("data_leakage")
    else:
        leakage_result = {"findings": [], "risk_score": 0.0}

    encoding_result = _detect_encoding_evasion(text) if encoding_check else {"findings": [], "risk_score": 0.0}
    if encoding_result["findings"]:
        findings.extend(encoding_result["findings"])
        risk_score += encoding_result["risk_score"]
        triggered_categories.append("encoding_evasion")

    typoglycemia_result = _detect_typoglycemia(text)
    if typoglycemia_result["findings"]:
        findings.extend(typoglycemia_result["findings"])
        risk_score += typoglycemia_result["risk_score"]
        triggered_categories.append("typoglycemia_evasion")

    payload_split_result = _detect_payload_splitting(text)
    if payload_split_result["findings"]:
        findings.extend(payload_split_result["findings"])
        risk_score += payload_split_result["risk_score"]
        triggered_categories.append("payload_splitting")

    markdown_injection_result = _detect_markdown_injection(text)
    if markdown_injection_result["findings"]:
        findings.extend(markdown_injection_result["findings"])
        risk_score += markdown_injection_result["risk_score"]
        triggered_categories.append("markdown_injection")

    html_injection_result = _detect_html_injection(text)
    if html_injection_result["findings"]:
        findings.extend(html_injection_result["findings"])
        risk_score += html_injection_result["risk_score"]
        triggered_categories.append("html_injection")

    context_overflow_result = _detect_context_overflow(text)
    if context_overflow_result["findings"]:
        findings.extend(context_overflow_result["findings"])
        risk_score += context_overflow_result["risk_score"]
        triggered_categories.append("context_overflow")

    crescendo_result = _detect_crescendo_pattern(text)
    if crescendo_result["findings"]:
        findings.extend(crescendo_result["findings"])
        risk_score += crescendo_result["risk_score"]
        triggered_categories.append("crescendo_escalation")

    reasoning_result = _detect_reasoning_attacks(text)
    if reasoning_result["findings"]:
        findings.extend(reasoning_result["findings"])
        risk_score += reasoning_result["risk_score"]
        triggered_categories.extend(reasoning_result.get("categories", ["reasoning_attacks"]))

    # False-positive guard: framing, politeness, storytelling, and generic
    # how-to patterns also match ordinary benign writing. They corroborate
    # real attacks but must never push a verdict to flag on their own.
    weak_only_categories = {
        "hypothetical_framing",
        "multiturn_escalation",
        "virtualization_nesting",
        "reasoning_attacks",
    }
    strong_hit = (
        any(c not in weak_only_categories for c in triggered_categories)
        or bool(encoding_result["findings"])
        or bool(typoglycemia_result["findings"])
        or bool(payload_split_result["findings"])
        or bool(markdown_injection_result["findings"])
        or bool(html_injection_result["findings"])
        or bool(context_overflow_result["findings"])
        or bool(crescendo_result["findings"])
        or bool(extraction_result["findings"])
        or bool(leakage_result["findings"])
    )
    if findings and not strong_hit:
        risk_score = min(risk_score, 0.25)
        findings.append("Weak signals only (hypothetical or benign framing). Capped below flag threshold.")

    risk_score = min(risk_score, 1.0)

    if risk_score >= 0.7:
        verdict = "block"
    elif risk_score >= 0.3:
        verdict = "flag"
    else:
        verdict = "allow"

    sanitized = None
    if verdict == "block" and direction == "output":
        sanitized = _sanitize_output(text)

    return {
        "verdict": verdict,
        "risk_score": round(risk_score, 3),
        "direction": direction,
        "findings": findings[:50],
        "sanitized_text": sanitized,
        "recommendation": _get_recommendation(verdict, findings, direction),
        "modules_triggered": list(set(triggered_categories)),
        "total_findings": len(findings),
    }


def _detect_jailbreak_patterns(text: str) -> dict:
    findings = []
    risk_score = 0.0
    categories_triggered = []

    for category, patterns in JAILBREAK_PATTERNS.items():
        hits = 0
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                if hits == 0:
                    findings.append(f"[{category}] Pattern match: {pattern[:80]}...")
                hits += 1
                if category != "prompt_leaking":
                    # Keep scanning: distinct extra hits corroborate the attack.
                    continue
        # Explicit attack categories flag on their own first hit; softer
        # framing categories need corroboration before reaching flag.
        STRONG_CATEGORIES = {
            "direct_override", "delimiter_injection", "authority_injection",
            "prompt_leaking", "encoding_evasion",
        }
        if hits:
            # First hit +0.15, each additional distinct pattern +0.1 (cap 0.45/category).
            risk_score += 0.15 + min(hits - 1, 3) * 0.1
            if category in STRONG_CATEGORIES:
                risk_score += 0.15
            if category == "prompt_leaking" and hits > 1:
                extra = min(hits - 1, 2)
                risk_score += 0.1 * extra
                findings.append(f"[{category}] {extra} additional distinct leak probes corroborate ({hits} total)")
            elif hits > 1:
                findings.append(f"[{category}] {hits - 1} additional distinct patterns corroborate")
            if category not in categories_triggered:
                categories_triggered.append(category)

    return {"findings": findings, "risk_score": min(risk_score, 0.9), "categories": categories_triggered}


def _detect_prompt_extraction(text: str) -> dict:
    findings = []
    risk_score = 0.0

    for pattern in SYSTEM_PROMPT_EXTRACTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            findings.append(f"Prompt extraction attempt detected: {pattern[:60]}...")
            risk_score += 0.3

    return {"findings": findings, "risk_score": min(risk_score, 0.8)}


def _detect_data_leakage(text: str) -> dict:
    findings = []
    risk_score = 0.0

    for category, patterns in DATA_LEAK_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, text)
            if matches:
                findings.append(f"[data_leak_{category}] Found {len(matches)} potential {category} exposure(s)")
                risk_score += 0.2 * len(matches)
                break

    return {"findings": findings, "risk_score": min(risk_score, 0.7)}


def _detect_encoding_evasion(text: str) -> dict:
    findings = []
    risk_score = 0.0

    for pattern in ENCODED_PAYLOAD_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            findings.append("Potential encoded/obfuscated payload detected")
            risk_score += 0.25
            break

    base64_pattern = r'(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?'
    potential_b64 = re.findall(base64_pattern, text)
    if potential_b64:
        try:
            decoded = base64.b64decode(potential_b64[0]).decode('utf-8', errors='ignore')
            if re.search(r'(?:ignore|override|bypass|reveal|system|instructions)', decoded, re.IGNORECASE):
                findings.append("Decoded Base64 payload contains suspicious instructions")
                risk_score += 0.5
        except (binascii.Error, UnicodeDecodeError):
            pass

    # Invisible unicode smuggling: zero-width and directional controls that
    # hide instructions from human reviewers but not from the model.
    if re.search(r'[\u200b\u200c\u200d\ufeff\u2060\u2061\u2062\u2063\u2064\u202a\u202b\u202c\u202d\u202e]', text):
        findings.append("Zero-width or directional unicode controls detected (possible smuggling)")
        risk_score += 0.3

    # Homoglyph evasion: Cyrillic lookalikes mixed into Latin text
    # (e.g. "іgnore" with a Cyrillic i) to dodge keyword filters.
    if re.search(r'[Ѐ-џ]', text) and re.search(r'[A-Za-z]', text):
        findings.append("Mixed Cyrillic and Latin scripts detected (possible homoglyph evasion)")
        risk_score += 0.25

    return {"findings": findings, "risk_score": min(risk_score, 0.6)}


def _detect_typoglycemia(text: str) -> dict:
    findings = []
    risk_score = 0.0

    scrambled_keywords = {
        "ignore": r"\bi[gnm][nvo][or][er]\b",
        "previous": r"\bpr[eo][vo][iu][uo]s\b",
        "instructions": r"\bins[tr][ru][uc][tc][ti][io][no]s\b",
        "bypass": r"\bb[yv][pa][as][sp]\b",
        "safety": r"\bs[fa][fa][ef][te][yb]\b",
        "reveal": r"\br[ev][ve][ea][al][l]\b",
        "system": r"\bs[ys][st][sy][et][me]\b",
        "override": r"\bo[ov][ve][er][rr][ri][de]\b",
        "delete": r"\bd[el][le][et][te]\b",
        "developer": r"\bd[ev][ve][el][lo][op][pe][er]\b",
        "password": r"\bps[as][sw][wo][or][dr]\b",
        "secret": r"\bs[ec][cr][re][et]\b",
    }

    for keyword, pattern in scrambled_keywords.items():
        if re.search(pattern, text, re.IGNORECASE):
            if not re.search(rf"\b{keyword}\b", text, re.IGNORECASE):
                findings.append(f"Typoglycemia evasion detected for keyword '{keyword}'")
                risk_score += 0.2

    return {"findings": findings, "risk_score": min(risk_score, 0.6)}


def _detect_payload_splitting(text: str) -> dict:
    findings = []
    risk_score = 0.0

    split_indicators = [
        r"(?:part|fragment|piece|segment|chunk|section|variable)\s*[A-Za-z\d]\s*[:=]",
        r"(?:fragment|piece|part|segment|component)\s*(?:one|two|three|four|five|1|2|3|4|5)\s*[:=]",
        r"(?:remember|store|save|keep|memorize|hold)\s+(?:this|the\s+following)\s*(?:fragment|piece|part|variable)",
        r"(?:now|then|next)\s*,?\s*(?:concatenate|combine|join|merge|assemble|put\s+together|stitch)",
        r"(?:combine|join|concatenate|assemble|put\s+together)\s+(?:the\s+)?(?:fragments?|parts?|pieces?)\s+(?:to\s+form|and\s+execute|and\s+follow)",
    ]

    for pattern in split_indicators:
        if re.search(pattern, text, re.IGNORECASE):
            findings.append("Payload splitting attack detected")
            risk_score += 0.3
            break

    return {"findings": findings, "risk_score": min(risk_score, 0.5)}


def _detect_markdown_injection(text: str) -> dict:
    findings = []
    risk_score = 0.0

    md_patterns = [
        r'!\[.*?\]\(https?://[^\)]+\?[^\)]*(?:data|secret|key|token|password)',
        r'\[.*?\]\(javascript:.*?\)',
        r'\[.*?\]\(data:text/html.*?\)',
        r'!\[.*?\]\(https?://[^\)]*webhook[^\)]*\)',
        r'!\[.*?\]\(https?://[^\)]*exfil[^\)]*\)',
        r'!\[.*?\]\(https?://[^\)]*\.burp[^\)]*\)',
        r'!\[.*?\]\(https?://[^\)]*requestbin[^\)]*\)',
        r'!\[.*?\]\(https?://[^\)]*pastebin[^\)]*\)',
        r'!\[.*?\]\(https?://[^\)]*\.ngrok[^\)]*\)',
    ]

    for pattern in md_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            findings.append(f"Markdown injection (data exfil attempt): {pattern[:60]}...")
            risk_score += 0.35

    return {"findings": findings, "risk_score": min(risk_score, 0.6)}


def _detect_html_injection(text: str) -> dict:
    findings = []
    risk_score = 0.0

    html_patterns = [
        r"<\s*img[^>]*\s+src\s*=\s*[\"']?\s*https?://",
        r"<\s*img[^>]*\s+onerror\s*=",
        r"<\s*script[^>]*>",
        r"javascript\s*:",
        r"<\s*svg[^>]*\s+onload\s*=",
        r"<\s*iframe[^>]*>",
        r"<\s*object[^>]*>",
        r"<\s*embed[^>]*>",
        r"on(?:click|load|error|mouseover|focus|blur)\s*=",
    ]

    for pattern in html_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            findings.append(f"HTML/JavaScript injection pattern: {pattern[:50]}...")
            risk_score += 0.3

    return {"findings": findings, "risk_score": min(risk_score, 0.6)}


def _detect_context_overflow(text: str) -> dict:
    findings = []
    risk_score = 0.0

    if len(text) > 50000:
        findings.append(f"Extremely long input detected ({len(text)} chars). Possible context overflow attack.")
        risk_score += 0.4

    repeated_patterns = re.findall(r'(.{10,})\1{10,}', text)
    if repeated_patterns:
        findings.append(f"Repetitive pattern detected (possible context flooding). Pattern length: {len(repeated_patterns[0])} chars")
        risk_score += 0.3

    word_count = len(text.split())
    unique_words = len(set(text.lower().split()))
    if word_count > 100 and unique_words / word_count < 0.1:
        findings.append("Low vocabulary diversity detected (possible padding attack)")
        risk_score += 0.2

    return {"findings": findings, "risk_score": min(risk_score, 0.5)}


def _detect_crescendo_pattern(text: str) -> dict:
    findings = []
    risk_score = 0.0

    crescendo_indicators = [
        r"(?:let(?:'|')?s|let\s+us)\s+(?:start|begin)\s+(?:with|by)\s+(?:something|anything)\s+(?:simple|easy|basic|small|minor|gentle|harmless|innocent|benign)",
        r"(?:first|initially|to\s+start|let(?:'|')?s\s+begin)\s*,?\s*(?:let(?:'|')?s|we\s+can)\s+(?:keep\s+it|make\s+it)\s+(?:simple|easy|basic|gentle|mild)",
        r"(?:that(?:'|')?s|that\s+is)\s+(?:great|good|nice|wonderful|perfect|excellent|amazing|helpful)\s*,?\s*(?:now|next|and\s+then)\s*,?\s*(?:can\s+you|could\s+you|I(?:'|')?d\s+like\s+to|tell\s+me)",
        r"(?:I\s+(?:really|truly|genuinely|honestly|sincerely)\s+(?:appreciate|value|thank\s+you\s+for|enjoy|like|admire))\s+(?:your|the|this|helping|being|doing)",
        r"(?:since|now\s+that|given\s+that)\s+(?:we(?:'|')?ve|we\s+have)\s+(?:established|built|created|formed|developed|achieved)\s+(?:a|this|some|such\s+(?:a|an))\s+(?:trust|rapport|connection|relationship|understanding|bond)",
        r"(?:now|next|moving\s+on|building\s+(?:on|upon)\s+(?:that|this|our\s+conversation))\s*,?\s*(?:I(?:'|')?d\s+like\s+to|could\s+you|can\s+you|tell\s+me|explain\s+to\s+me|share\s+with\s+me|help\s+me\s+(?:understand|with))",
    ]

    matches = 0
    for pattern in crescendo_indicators:
        if re.search(pattern, text, re.IGNORECASE):
            matches += 1

    if matches >= 2:
        findings.append(f"Crescendo escalation pattern detected ({matches}/{len(crescendo_indicators)} indicators)")
        risk_score += 0.4

    return {"findings": findings, "risk_score": min(risk_score, 0.5)}


def _sanitize_output(text: str) -> str:
    sanitized = text

    for category, patterns in DATA_LEAK_PATTERNS.items():
        for pattern in patterns:
            try:
                sanitized = re.sub(pattern, f"[REDACTED-{category.upper()}]", sanitized)
            except re.error:
                continue

    sanitized = re.sub(r"-----BEGIN[\s\S]*?-----END[\s\S]*?-----", "[REDACTED-KEY]", sanitized)

    return sanitized


def _detect_reasoning_attacks(text: str) -> dict:
    findings = []
    risk_score = 0.0
    categories = []

    for pattern in JAILBREAK_PATTERNS.get("reasoning_attacks", []):
        if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
            findings.append(f"Reasoning model attack pattern detected: {pattern[:60]}...")
            risk_score += 0.25
            categories.append("reasoning_attacks")
            break

    for pattern in JAILBREAK_PATTERNS.get("indirect_injection", []):
        if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
            findings.append(f"Indirect prompt injection via data detected")
            risk_score += 0.35
            categories.append("indirect_injection")
            break

    for pattern in JAILBREAK_PATTERNS.get("multimodal_injection", []):
        if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
            findings.append(f"Multi-modal injection attempt detected (markdown/image exfil)")
            risk_score += 0.4
            categories.append("multimodal_injection")
            break

    for pattern in JAILBREAK_PATTERNS.get("token_smuggling", []):
        if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
            findings.append(f"Token smuggling / payload splitting detected")
            risk_score += 0.3
            categories.append("token_smuggling")
            break

    return {"findings": findings, "risk_score": min(risk_score, 0.8), "categories": categories}


def _get_recommendation(verdict: str, findings: list, direction: str) -> str:
    if verdict == "block":
        if direction == "input":
            return "This prompt has been BLOCKED due to high-risk attack patterns. The input shows clear signs of jailbreak, prompt injection, or instruction override attempts. Reject this input entirely."
        return "This response has been BLOCKED due to detected data leakage or prompt extraction. The output contains sensitive information that should not be exposed. Return a safe alternative response."
    elif verdict == "flag":
        if direction == "input":
            return "This prompt has been FLAGGED for suspicious patterns. Review the findings carefully before processing. Consider applying additional input sanitization or requiring human review."
        return "This response has been FLAGGED for potential issues. Review the output before delivering to the user. Consider applying output sanitization."
    return "Content appears safe. Continue with standard processing."
