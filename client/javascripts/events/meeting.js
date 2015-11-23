var timerId = 0;

/** The events that meeting template contains */
Template.meeting.events({
    /** A click on talkCancel opens the lineup page or cancels the user's speech */
    'click #talkCancel': function(e) {
        if(e.target.value == "Talk") {
            Router.go('/meeting/' + Session.get("meetingId") + '/lineup');
        } else {
            Speeches.update(Speeches.findOne({user: Session.get("userId"), status: {$in: ["ongoing", "pending"]}})._id, {$set: {status: "done"}});
        }
    },
    /** A click on waitProceed starts or stops the timer */
    'click #waitProceed': function(e) {
        if(e.target.value == "Wait") {
            Meteor.clearInterval(timerId);
            Speeches.update(
                Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"})._id,
                {$set: {status: "pending"}}
            );
        } else {
            Speeches.update(
                Speeches.findOne({meeting: Session.get("meetingId"), status: "pending"})._id,
                {$set: {status: "ongoing"}}
            );
            timerId = Meteor.setInterval(function() {
                Speeches.update(
                    Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"})._id,
                    {$set: {timeLeft: Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"}).timeLeft + 1}}
                );
                if(Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"}).timeLeft == Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"}).time){
                    Speeches.update(
                        Speeches.findOne({meeting: Session.get("meetingId"), status: "ongoing"})._id,
                        {$set: {status: "done"}}
                    );
                    Meteor.clearInterval(timerId);
                }
            } , 1000);
        }
    },

    /** A click on next goes to the next speech */
    'click #next': function() {
        Meteor.clearInterval(timerId);
        Speeches.update(Speeches.findOne({meeting: Session.get("meetingId"), status: {$in: ["ongoing", "pending"]}})._id, {$set: {status: "done"}});
    },

    /** A click on closeMeeting closes the meeting */
    'click #closeMeeting': function() {
        Meetings.update(Session.get("meetingId"), {$set: {status: "done"}});
        Session.set("meetingId", "");
        Session.set("userId", "");
        Router.go("home");
    },

    'keyup .participantsEmails': function(e) {
        var input = $(e.target);

        if (input.val().length > 0) {
            var rank = input.parents(".participantEmailInput")[0].getAttribute('rank');
            var form = input.parents("#inviteForm");
            var nextRank = parseInt(rank) + 1;

            if ($(form).find('.participantEmailInput[rank="'+nextRank+'"]').length < 1) {
                var newInput = $(input.parents(".participantEmailInput")[0].cloneNode(true));
                newInput.find(".participantsEmails").val("");
                newInput.attr('rank', nextRank);
                $(input.parents(".email-input-group")[0]).append(newInput)
            }
        }
    },

    'keyup .participantsName': function(e) {
        var input = $(e.target);

        if (input.val().length > 0) {
            var rank = input.parents(".participantNameInput")[0].getAttribute('rank');
            var form = input.parents("#localForm");
            var nextRank = parseInt(rank) + 1;

            if ($(form).find('.participantNameInput[rank="'+nextRank+'"]').length < 1) {
                var newInput = $(input.parents(".participantNameInput")[0].cloneNode(true));
                newInput.find(".participantsName").val("");
                newInput.attr('rank', nextRank);
                $(input.parents(".name-input-group")[0]).append(newInput)
            }
        }
    },

    'submit #inviteForm': function(e) {
        e.preventDefault();
        var meetingId = Session.get("meetingId");
        var meeting = Meetings.findOne({_id:meetingId});
        var dialog = $("#invitationModal")
        dialog.modal("hide");

        var participantsInputs = $('.participantsEmails');
        var participantsEmails = [];

        for (i = 0; i < participantsInputs.length; i++) {
            if (participantsInputs[i].value != "") {
                participantsEmails.push(participantsInputs[i].value)
            }
        }

        //* remove already invited emails from emails to invite
        var invitedParticipants = Session.get('invitedParticipants');
        if (typeof invitedParticipants != 'undefined') {
            for (i = 0; i < invitedParticipants.length; i++) {
                for (j = 0; j < participantsEmails.length; j++) {
                    if (invitedParticipants[i] == participantsEmails[j]) {
                        participantsEmails.splice(j,1);
                    }
                }
            }
            invitedParticipants = invitedParticipants.concat(participantsEmails)
            Session.set('invitedParticipants', invitedParticipants)
        } else {
            Session.set('invitedParticipants', participantsEmails)
        }

        var userId = "";
        for(var i = 0; i < participantsEmails.length; i++) {
            userId = Users.insert({
                name: 'participant pending',
                email: participantsEmails[i],
                type: "participant",
                status: "pending",
                meeting: meetingId
            });
            Meteor.call('sendEmail', participantsEmails[i], 'noreply@taketalk.com', 'TakeTalk invitation',
                'You are invited to a session of TakeTalk. \n' +
                'Please follow this link : taketalk.meteor.com/join/' + meetingId + '/' + userId + '\n' +
                'If you quit the meeting and want to return here is the password : ' + meeting.password
            );
            console.log('taketalk.meteor.com/join/' + meetingId + '/' + userId + ' -> ' + meeting.password);
        }

        $(".participantEmailInput[rank!='1']").remove();
        participantsInputs.val("");
    },

    'submit #localForm': function(e) {
        e.preventDefault();
        meetingId = Session.get("meetingId");
        var dialog = $("#localModal");
        dialog.modal("hide");

        var nameInputs = $('.participantsName');
        var participantsName = [];

        for (i = 0; i < nameInputs.length; i++) {
            if (nameInputs[i].value != "") {
                participantsName.push(nameInputs[i].value)
            }
        }

        //* remove already invited emails from emails to invite
        var localParticipants = Session.get("guests");
        if (typeof localParticipants != 'undefined') {
            for (i = 0; i < localParticipants.length; i++) {
                for (j = 0; j < participantsName.length; j++) {
                    if (localParticipants[i] == participantsName[j]) {
                        participantsName.splice(j,1);
                    }
                }
            }
            localParticipants = localParticipants.concat(participantsName);
            Session.set("guests", localParticipants);
        } else {
            Session.set("guests", participantsName);
        }

        $(".participantNameInput[rank!='1']").remove();
        nameInputs.val("");

        for (i = 0; i < participantsName.length; i++) {
            Users.insert({
                name: participantsName[i],
                type: "",
                status: "online",
                meeting: meetingId,
                _id: participantsName[i]
            });
        }
    },

    'click .removeGuest': function(e) {
        e.preventDefault();
        guests = Session.get("guests");
        guestToRemove = $(e.target).parents( ".guestRemove" ).attr("guest");
        guests.splice(guests.indexOf(guestToRemove),1);
        Session.set("guests", guests);
        Users.remove({_id: guestToRemove})
    },

    'click .removeSpeech': function(e) {
        e.preventDefault();
        var speechId = $(e.target).parents( ".speech-span" ).attr("speech-id");
        Speeches.remove({_id: speechId});
    }
});

Template.meeting.helpers ({
    ordres: function () {
        var meeting = Meetings.findOne({_id: Session.get("meetingId")});
        var ordres = meeting.ordres;
        var times = meeting.ordreTimes;
        var lengthOrdres = ordres.length;
        var ordreAndTimes = new Array(lengthOrdres);
        for (var i = 0; i < lengthOrdres; i++) {
            ordreAndTimes[i] = {"ordre" : ordres[i], "time" :times[i]};
        }
        return ordreAndTimes;
    },

    isTimeNull: function (time) {
        return time == '0:00';
    },

    guests: function () {
        return Session.get("guests");
    },

    isSessionGuest: function (name) {
        var guests = Session.get("guests");
        if (guests !== undefined) {
            return (guests.indexOf(name) >= 0);
        }
        return false;
    },

    isAnimator: function() {
        return Users.findOne({_id: Session.get("userId")}).type == "animator";
    }
});
/*
$(document).ready(function(){

    var meetingId = Session.get("meetingId");
    var userId = Users.insert({
        name: 'participant pending',
        email: "temp@taketalk.fr",
        type: "participant",
        status: "pending",
        meeting: meetingId
    });
    console.log('taketalk.meteor.com/join/' + meetingId + '/' + userId);

    //new QRCode(document.getElementById("qrcode"), "http://taketalk.meteor.com/join/" + meetingId + "/" + userId);
    var qrcode = new QRCode(document.getElementById("qrcode"), {
        text: "http://taketalk.meteor.com/join/" + meetingId + "/" + userId,
        width: 128,
        height: 128,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    //qrcode.makeCode("http://taketalk.meteor.com/join/" + meetingId + "/" + userId);
}); //*/
