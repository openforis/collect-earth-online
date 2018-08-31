package org.openforis.ceo.model;

public class ProjectStats {

    private int flaggedPlots = 0;
    private int assignedPlots = 0;
    private int unassignedPlots = 0;
    private int members = 0;
    private int contributors = 0;

    public int getFlaggedPlots() {
        return flaggedPlots;
    }

    public void setFlaggedPlots(int flaggedPlots) {
        this.flaggedPlots = flaggedPlots;
    }

    public int getAssignedPlots() {
        return assignedPlots;
    }

    public void setAssignedPlots(int assignedPlots) {
        this.assignedPlots = assignedPlots;
    }

    public int getUnassignedPlots() {
        return unassignedPlots;
    }

    public void setUnassignedPlots(int unassignedPlots) {
        this.unassignedPlots = unassignedPlots;
    }

    public int getMembers() {
        return members;
    }

    public void setMembers(int members) {
        this.members = members;
    }

    public int getContributors() {
        return contributors;
    }

    public void setContributors(int contributors) {
        this.contributors = contributors;
    }

}
