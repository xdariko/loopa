require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  test "stores the composition as JSON and assigns a share token" do
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

    assert_equal document, project.reload.data
    assert_nil project.user_id
    assert_predicate project.share_token, :present?
    assert_not_equal project.share_token, another.share_token
    assert_equal project, Project.find_by!(share_token: project.share_token)
  end

  test "rejects an empty title and unsupported project documents" do
    project = Project.new(title: " ", data: { "version" => 1 })
    assert_not project.valid?
    assert project.errors[:title].any?

    [nil, [], '{"version":1}', {}, { "version" => "1" }, { "version" => 2 }].each do |document|
      project = Project.new(title: "Loop", data: document)
      assert_not project.valid?
      assert project.errors[:data].any?
    end
  end

  test "the database rejects duplicate share tokens" do
    first = Project.create!(title: "First", data: { "version" => 1 })
    second = Project.create!(title: "Second", data: { "version" => 1 })

    assert_raises(ActiveRecord::RecordNotUnique) do
      second.update_columns(share_token: first.share_token)
    end
  end

  test "keeps more than one sample on a project" do
    project = Project.create!(title: "Loop", data: { "version" => 1 })
    project.samples.attach(
      { io: StringIO.new("kick"), filename: "kick.wav", content_type: "audio/wav", identify: false },
      { io: StringIO.new("snare"), filename: "snare.wav", content_type: "audio/wav", identify: false }
    )

    assert_equal %w[kick.wav snare.wav], project.reload.samples.map { |sample| sample.filename.to_s }.sort
  ensure
    project&.samples&.purge
  end
end
