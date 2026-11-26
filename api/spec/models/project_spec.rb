require "rails_helper"

RSpec.describe Project, type: :model do
  it "stores the composition as JSON and assigns a share token" do
    document = {
      "version" => 1,
      "title" => "Loop",
      "bpm" => 120,
      "swing" => 0,
      "tracks" => [],
      "arrangement" => { "barCount" => 4, "lanes" => {} }
    }
    project = Project.create!(title: "Loop", data: document)
    another = Project.create!(title: "Loop", data: document)

    expect(project.reload.data).to eq(document)
    expect(project.user_id).to be_nil
    expect(project.share_token).to be_present
    expect(another.share_token).not_to eq(project.share_token)
    expect(Project.find_by!(share_token: project.share_token)).to eq(project)
  end

  it "rejects an empty title" do
    project = Project.new(title: " ", data: { "version" => 1 })
    expect(project).not_to be_valid
    expect(project.errors[:title]).not_to be_empty
  end

  it "rejects unsupported project documents" do
    [nil, [], '{"version":1}', {}, { "version" => "1" }, { "version" => 2 }].each do |document|
      project = Project.new(title: "Loop", data: document)
      expect(project).not_to be_valid
      expect(project.errors[:data]).not_to be_empty
    end
  end

  it "the database rejects duplicate share tokens" do
    first = Project.create!(title: "First", data: { "version" => 1 })
    second = Project.create!(title: "Second", data: { "version" => 1 })

    expect do
      second.update_columns(share_token: first.share_token)
    end.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "keeps more than one sample on a project" do
    project = Project.create!(title: "Loop", data: { "version" => 1 })
    project.samples.attach(
      { io: StringIO.new("kick"), filename: "kick.wav", content_type: "audio/wav", identify: false },
      { io: StringIO.new("snare"), filename: "snare.wav", content_type: "audio/wav", identify: false }
    )

    expect(project.reload.samples.map { |sample| sample.filename.to_s }.sort).to eq(%w[kick.wav snare.wav])
  ensure
    project&.samples&.purge
  end
end
